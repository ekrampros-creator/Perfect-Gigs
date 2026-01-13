import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, ArrowLeft, Loader2, User, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { messagesAPI, profileAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export const Messages = () => {
  const { otherUserId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { returnTo: '/messages' } });
      return;
    }
    
    if (otherUserId) {
      loadConversation();
    } else {
      loadConversations();
    }
  }, [isAuthenticated, otherUserId, navigate]);

  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, (payload) => {
        if (payload.new.sender_id === otherUserId) {
          setMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, otherUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await messagesAPI.getConversations();
      if (response.data.success) {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async () => {
    try {
      const [messagesRes, profileRes] = await Promise.all([
        messagesAPI.getConversation(otherUserId),
        profileAPI.get(otherUserId)
      ]);

      if (messagesRes.data.success) {
        setMessages(messagesRes.data.messages);
      }
      if (profileRes.data.success) {
        setOtherUser(profileRes.data.profile);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await messagesAPI.send({
        receiver_id: otherUserId,
        content: newMessage
      });

      if (response.data.success) {
        setMessages(prev => [...prev, response.data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!otherUserId) {
    return (
      <div className="min-h-screen py-8 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-heading font-semibold text-2xl text-foreground mb-6">
            Messages
          </h1>

          {conversations.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-foreground font-medium mb-1">No messages yet</h3>
              <p className="text-muted-foreground text-sm">
                Start a conversation by contacting a gig poster
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv, index) => (
                <motion.div
                  key={conv.other_user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => navigate(`/messages/${conv.other_user_id}`)}
                  className="bg-card rounded-xl border border-border p-4 cursor-pointer card-hover flex items-center gap-3"
                  data-testid={`conversation-${conv.other_user_id}`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {conv.other_user_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-foreground font-medium text-sm truncate">
                        {conv.other_user_name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.last_message_time).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs truncate">
                      {conv.last_message}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-xs text-primary-foreground font-medium">
                        {conv.unread_count}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/messages')}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {otherUser?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-foreground font-medium text-sm">{otherUser?.name}</p>
            <p className="text-xs text-muted-foreground">{otherUser?.location || 'Career Plus User'}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((message, index) => {
            const isOwn = message.sender_id === user.id;
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className={`text-xs ${isOwn ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {isOwn ? user.name?.charAt(0) : otherUser?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                  <div className={`rounded-lg px-3 py-2 text-sm ${
                    isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                  }`}>
                    <p>{message.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="bg-card border-t border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 h-10 bg-secondary border-border text-sm"
            data-testid="message-input"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="h-10 w-10 bg-primary hover:bg-primary/90"
            size="icon"
            data-testid="send-btn"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
