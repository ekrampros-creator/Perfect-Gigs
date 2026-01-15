import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, User, Loader2, Search, FileText, UserPlus, Lightbulb } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { aiAPI, gigsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
  'Content Writing', 'Video Editing', 'Social Media', 'Data Entry',
  'Virtual Assistant', 'Translation', 'Tutoring', 'Photography',
  'Music & Audio', 'Marketing', 'Delivery', 'Other'
];

const quickActions = [
  { icon: Search, label: 'Find gigs', prompt: 'find_gigs', requiresFreelancer: true },
  { icon: FileText, label: 'Post a gig', prompt: 'post_gig', requiresAuth: true },
  { icon: UserPlus, label: 'Become freelancer', prompt: 'register_freelancer', requiresAuth: true },
  { icon: Lightbulb, label: 'Help me', prompt: 'help' },
];

// Gig posting wizard steps
const GIG_STEPS = [
  { key: 'title', question: "What's the title of your gig?", type: 'text', placeholder: 'e.g., Build a React landing page' },
  { key: 'description', question: "Describe what you need done:", type: 'textarea', placeholder: 'Include requirements, deliverables, and any specific details...' },
  { key: 'category', question: "What category does this fall under?", type: 'select', options: CATEGORIES },
  { key: 'location', question: "Where is this gig based? (or type 'Remote')", type: 'text', placeholder: 'e.g., Dhaka, Remote' },
  { key: 'budget_min', question: "What's your minimum budget? (in USD)", type: 'number', placeholder: '50' },
  { key: 'budget_max', question: "And the maximum budget? (in USD)", type: 'number', placeholder: '200' },
  { key: 'duration_start', question: "When should this start?", type: 'date' },
  { key: 'duration_end', question: "And when's the deadline?", type: 'date' },
  { key: 'people_needed', question: "How many people do you need?", type: 'number', placeholder: '1' },
  { key: 'is_urgent', question: "Is this urgent?", type: 'select', options: ['No', 'Yes'] },
];

export const AIChat = ({ isOpen, onClose, isFullPage = false }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm Ishan, your Perfect Gigs assistant. What would you like to do today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wizardMode, setWizardMode] = useState(null); // 'post_gig' | 'find_gigs' | null
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState({});
  const [userTone, setUserTone] = useState('casual'); // 'casual' | 'formal' | 'genz'
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const { isAuthenticated, user } = useAuth();
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

  // Detect user tone from message
  const detectTone = (text) => {
    const genZWords = ['fr', 'no cap', 'lowkey', 'highkey', 'bruh', 'ngl', 'ong', 'slay', 'bet', 'vibe', 'lit', 'fire'];
    const formalWords = ['please', 'kindly', 'would you', 'could you', 'I would like', 'I am looking', 'require', 'seeking'];
    
    const lowerText = text.toLowerCase();
    
    if (genZWords.some(word => lowerText.includes(word))) {
      return 'genz';
    } else if (formalWords.some(word => lowerText.includes(word))) {
      return 'formal';
    }
    return 'casual';
  };

  // Get response based on tone
  const getTonedResponse = (baseResponse, tone) => {
    if (tone === 'genz') {
      return baseResponse
        .replace("Great!", "Yoo that's fire!")
        .replace("Perfect!", "No cap, that's perfect!")
        .replace("Got it!", "Bet!")
        .replace("What's", "Yo what's")
        .replace("next", "next fr");
    } else if (tone === 'formal') {
      return baseResponse
        .replace("Got it!", "Understood.")
        .replace("Great!", "Excellent.")
        .replace("Perfect!", "Very well.")
        .replace("Hey!", "Hello,")
        .replace("Yo", "");
    }
    return baseResponse;
  };

  const addAssistantMessage = (content, inputConfig = null) => {
    const tonedContent = getTonedResponse(content, userTone);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: tonedContent,
      inputConfig 
    }]);
  };

  const handleQuickAction = (action) => {
    if (action.requiresAuth && !isAuthenticated) {
      addAssistantMessage("You need to sign in first! Click the button below to continue.");
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '',
        action: { type: 'AUTH_REQUIRED' }
      }]);
      return;
    }

    if (action.requiresFreelancer && !user?.is_freelancer) {
      addAssistantMessage("To find gigs, you need to be registered as a freelancer first. Want me to help you register?");
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '',
        action: { type: 'REGISTER_FREELANCER' }
      }]);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: action.label }]);

    switch (action.prompt) {
      case 'post_gig':
        setWizardMode('post_gig');
        setWizardStep(0);
        setWizardData({});
        const step = GIG_STEPS[0];
        addAssistantMessage(step.question, { type: step.type, placeholder: step.placeholder, options: step.options });
        break;
      case 'find_gigs':
        setWizardMode('find_gigs');
        addAssistantMessage("What kind of gigs are you looking for? Enter a category or keyword:", { type: 'text', placeholder: 'e.g., Web Development, design...' });
        break;
      case 'register_freelancer':
        addAssistantMessage("I'll take you to the freelancer registration page!");
        setTimeout(() => {
          navigate('/freelancer/register');
          if (!isFullPage) onClose();
        }, 1000);
        break;
      case 'help':
        addAssistantMessage("I can help you with:\n• Post a gig - Create a new job posting\n• Find gigs - Browse available opportunities (freelancers only)\n• Become a freelancer - Register to start applying\n\nWhat would you like to do?");
        break;
      default:
        break;
    }
  };

  const handleWizardInput = async (value) => {
    const detectedTone = detectTone(value);
    if (detectedTone !== userTone) {
      setUserTone(detectedTone);
    }

    setMessages(prev => [...prev, { role: 'user', content: value }]);
    setInput('');

    if (wizardMode === 'post_gig') {
      const currentStep = GIG_STEPS[wizardStep];
      let processedValue = value;
      
      if (currentStep.key === 'is_urgent') {
        processedValue = value.toLowerCase() === 'yes';
      } else if (currentStep.type === 'number') {
        processedValue = parseFloat(value) || 1;
      }

      const newData = { ...wizardData, [currentStep.key]: processedValue };
      setWizardData(newData);

      if (wizardStep < GIG_STEPS.length - 1) {
        setWizardStep(wizardStep + 1);
        const nextStep = GIG_STEPS[wizardStep + 1];
        setTimeout(() => {
          addAssistantMessage(`Got it! ${nextStep.question}`, { 
            type: nextStep.type, 
            placeholder: nextStep.placeholder,
            options: nextStep.options 
          });
        }, 500);
      } else {
        // All steps complete - post the gig
        setIsLoading(true);
        try {
          const gigData = {
            ...newData,
            budget_min: parseFloat(newData.budget_min),
            budget_max: parseFloat(newData.budget_max),
            people_needed: parseInt(newData.people_needed) || 1,
            is_urgent: newData.is_urgent === true || newData.is_urgent === 'Yes'
          };
          
          const response = await gigsAPI.create(gigData);
          if (response.data.success) {
            addAssistantMessage("Your gig has been posted! 🎉 Want to view it?");
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: '',
              action: { type: 'VIEW_GIG', gigId: response.data.gig.id }
            }]);
          }
        } catch (error) {
          addAssistantMessage("Oops, something went wrong posting your gig. Please try again or use the form directly.");
        } finally {
          setIsLoading(false);
          setWizardMode(null);
          setWizardStep(0);
          setWizardData({});
        }
      }
    } else if (wizardMode === 'find_gigs') {
      setIsLoading(true);
      try {
        const response = await gigsAPI.list({ category: value, limit: 5 });
        if (response.data.success && response.data.gigs.length > 0) {
          const gigs = response.data.gigs;
          addAssistantMessage(`Found ${gigs.length} gigs matching "${value}":`);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '',
            gigs: gigs
          }]);
        } else {
          addAssistantMessage(`No gigs found for "${value}". Try a different category or check back later!`);
        }
      } catch (error) {
        addAssistantMessage("Couldn't fetch gigs right now. Please try again!");
      } finally {
        setIsLoading(false);
        setWizardMode(null);
      }
    }
  };

  const handleSend = async (text = input) => {
    if (!text.trim()) return;
    
    if (wizardMode) {
      handleWizardInput(text);
      return;
    }

    const detectedTone = detectTone(text);
    if (detectedTone !== userTone) {
      setUserTone(detectedTone);
    }

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiAPI.chat({
        message: text,
        context: { 
          current_page: window.location.pathname,
          user_tone: userTone,
          is_freelancer: user?.is_freelancer
        }
      });

      if (response.data.success) {
        const tonedResponse = getTonedResponse(response.data.response, userTone);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: tonedResponse,
          action: response.data.action
        }]);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      addAssistantMessage("I'm having trouble connecting right now. Please try again!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action) => {
    if (!action) return;
    
    switch (action.type) {
      case 'AUTH_REQUIRED':
        navigate('/auth');
        if (!isFullPage) onClose();
        break;
      case 'REGISTER_FREELANCER':
        navigate('/freelancer/register');
        if (!isFullPage) onClose();
        break;
      case 'VIEW_GIG':
        navigate(`/gigs/${action.gigId}`);
        if (!isFullPage) onClose();
        break;
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

  const getCurrentInputConfig = () => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.inputConfig) {
      return lastMessage.inputConfig;
    }
    return { type: 'text', placeholder: 'Ask Ishan anything...' };
  };

  const inputConfig = getCurrentInputConfig();

  const renderInput = () => {
    if (inputConfig.type === 'select' && inputConfig.options) {
      return (
        <Select onValueChange={(value) => handleSend(value)}>
          <SelectTrigger className="flex-1 h-10 bg-secondary border-border text-sm">
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {inputConfig.options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (inputConfig.type === 'textarea') {
      return (
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={inputConfig.placeholder}
          className="flex-1 min-h-[60px] bg-secondary border-border text-sm resize-none"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
      );
    }

    if (inputConfig.type === 'date') {
      return (
        <Input
          ref={inputRef}
          type="date"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 h-10 bg-secondary border-border text-sm"
          disabled={isLoading}
          onKeyDown={handleKeyDown}
        />
      );
    }

    return (
      <Input
        ref={inputRef}
        type={inputConfig.type === 'number' ? 'number' : 'text'}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={inputConfig.placeholder}
        className="flex-1 h-10 bg-secondary border-border text-sm"
        disabled={isLoading}
        data-testid="ai-chat-input"
      />
    );
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
            <h3 className="font-heading font-semibold text-foreground text-sm">Ishan</h3>
            <p className="text-xs text-muted-foreground">Your AI Assistant</p>
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
                {message.content && (
                  <>
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
                    </div>
                  </>
                )}
                
                {/* Gigs list */}
                {message.gigs && (
                  <div className="w-full space-y-2 mt-2">
                    {message.gigs.map(gig => (
                      <div 
                        key={gig.id}
                        onClick={() => { navigate(`/gigs/${gig.id}`); if (!isFullPage) onClose(); }}
                        className="p-3 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                      >
                        <p className="text-foreground font-medium text-sm">{gig.title}</p>
                        <p className="text-muted-foreground text-xs">${gig.budget_min}-${gig.budget_max} • {gig.location}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Action buttons */}
                {message.action && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-accent hover:bg-accent/90"
                      onClick={() => handleAction(message.action)}
                      data-testid={`action-btn-${message.action.type}`}
                    >
                      {message.action.type === 'AUTH_REQUIRED' && 'Sign In'}
                      {message.action.type === 'REGISTER_FREELANCER' && 'Register Now'}
                      {message.action.type === 'VIEW_GIG' && 'View Gig'}
                      {message.action.type === 'SEARCH_GIGS' && 'View Results'}
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
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
      {messages.length <= 2 && !wizardMode && (
        <div className="px-5 pb-3">
          <p className="text-xs text-muted-foreground mb-2">Quick actions</p>
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2.5 border-border hover:bg-secondary"
                onClick={() => handleQuickAction(action)}
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
          {renderInput()}
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
        {wizardMode === 'post_gig' && (
          <p className="text-xs text-muted-foreground mt-2">
            Step {wizardStep + 1} of {GIG_STEPS.length}
          </p>
        )}
      </div>
    </div>
  );

  if (isFullPage) {
    return <div className="h-full">{chatContent}</div>;
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
            className="fixed bottom-4 right-4 w-[400px] h-[580px] z-50 shadow-2xl"
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
      <span>Ask Ishan</span>
    </motion.button>
  );
};

export default AIChat;
