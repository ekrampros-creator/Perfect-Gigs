import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, User, Loader2, Search, FileText, UserPlus, Lightbulb } from 'lucide-react';
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
  { icon: Lightbulb, label: 'Quick tips', prompt: 'Give me some tips for getting started' },
];

export const AIChat = ({ isOpen, onClose, isFullPage = false }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Career Plus assistant. I can help you find gigs, post opportunities, or set up your freelancer profile. What would you like to do?"
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
        content: "I'm having trouble connecting right now. Please try again in a moment."
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
    <div className="flex flex-col h-full bg-card rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Here to help</p>
          </div>
        </div>
        {!isFullPage && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8" data-testid="close-chat-btn">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4" ref={scrollRef}>
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-primary/10' 
                    : 'bg-secondary'
                }`}>
                  {message.role === 'user' 
                    ? <User className="w-3.5 h-3.5 text-primary" />
                    : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  }
                </div>
                <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`rounded-lg px-3.5 py-2.5 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                  {message.action && (
                    <Button
                      size="sm"
                      className="mt-2 h-8 text-xs bg-accent hover:bg-accent/90"
                      onClick={() => handleAction(message.action)}
                      data-testid={`action-btn-${message.action.type}`}
                    >
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
              <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="bg-secondary rounded-lg px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-5 pb-3">
          <p className="text-xs text-muted-foreground mb-2">Quick actions</p>
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2.5 border-border hover:bg-secondary"
                onClick={() => handleSend(action.prompt)}
                data-testid={`quick-action-${index}`}
              >
                <action.icon className="w-3 h-3 mr-1.5" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 h-10 bg-secondary border-border text-sm"
            disabled={isLoading}
            data-testid="ai-chat-input"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 bg-primary hover:bg-primary/90"
            size="icon"
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
      <div className="h-full">
        {chatContent}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-4 right-4 w-[380px] h-[560px] z-50 shadow-2xl"
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 h-12 px-4 rounded-full bg-primary text-primary-foreground flex items-center gap-2 shadow-lg z-[100] font-medium text-sm cursor-pointer"
      data-testid="open-ai-chat-btn"
      style={{ pointerEvents: 'auto' }}
    >
      <Bot className="w-5 h-5" />
      <span>AI Assistant</span>
    </motion.button>
  );
};

export default AIChat;
