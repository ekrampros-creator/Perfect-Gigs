import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, X, Bot, User, Loader2, Zap, Search, FileText, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { aiAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const quickActions = [
  { icon: Search, label: 'Find gigs', prompt: 'Help me find gigs' },
  { icon: FileText, label: 'Post a gig', prompt: 'I want to post a new gig' },
  { icon: UserPlus, label: 'Become freelancer', prompt: 'How do I register as a freelancer?' },
  { icon: Zap, label: 'Quick tips', prompt: 'Give me some tips for getting started' },
];

export const AIChat = ({ isOpen, onClose, isFullPage = false }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey there! 👋 I'm your Career Plus AI assistant. I can help you find gigs, post opportunities, or set up your freelancer profile. What would you like to do today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (text = input) => {
    if (!text.trim()) return;
    
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiAPI.chat({
        message: text,
        context: { current_page: window.location.pathname }
      });

      if (response.data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.response,
          action: response.data.action
        }]);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment!"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action) => {
    if (!action) return;
    
    switch (action.type) {
      case 'SEARCH_GIGS':
        navigate('/gigs', { state: { filters: action.data } });
        if (!isFullPage) onClose();
        break;
      case 'POST_GIG':
        if (!isAuthenticated) {
          navigate('/auth', { state: { returnTo: '/post-gig' } });
        } else {
          navigate('/post-gig', { state: { prefill: action.data } });
        }
        if (!isFullPage) onClose();
        break;
      case 'REGISTER_FREELANCER':
        if (!isAuthenticated) {
          navigate('/auth', { state: { returnTo: '/freelancer/register' } });
        } else {
          navigate('/freelancer/register');
        }
        if (!isFullPage) onClose();
        break;
      case 'UPDATE_PROFILE':
        if (!isAuthenticated) {
          navigate('/auth', { state: { returnTo: '/profile' } });
        } else {
          navigate('/profile');
        }
        if (!isFullPage) onClose();
        break;
      default:
        break;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-unbounded font-semibold text-white">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
        {!isFullPage && (
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="close-chat-btn">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-accent/20' 
                    : 'bg-primary/20'
                }`}>
                  {message.role === 'user' 
                    ? <User className="w-4 h-4 text-accent" />
                    : <Bot className="w-4 h-4 text-primary" />
                  }
                </div>
                <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'glass'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.action && (
                    <Button
                      size="sm"
                      className="mt-2 bg-primary hover:bg-primary/90"
                      onClick={() => handleAction(message.action)}
                      data-testid={`action-btn-${message.action.type}`}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Execute Action
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="glass rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Quick actions</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs border-white/10 hover:bg-white/5"
                onClick={() => handleSend(action.prompt)}
                data-testid={`quick-action-${index}`}
              >
                <action.icon className="w-3 h-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 bg-white/5 border-white/10 focus:border-primary/50"
            disabled={isLoading}
            data-testid="ai-chat-input"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="bg-primary hover:bg-primary/90"
            data-testid="send-message-btn"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return (
      <div className="h-full glass-heavy rounded-2xl overflow-hidden">
        {chatContent}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Chat Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-4 right-4 w-[400px] h-[600px] glass-heavy rounded-2xl overflow-hidden z-50 shadow-2xl"
            data-testid="ai-chat-modal"
          >
            {chatContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const AIChatButton = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg glow-primary z-30"
      data-testid="open-ai-chat-btn"
    >
      <Sparkles className="w-6 h-6 text-white" />
    </motion.button>
  );
};

export default AIChat;
