import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, User, Loader2, Search, FileText, UserPlus, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { aiAPI, gigsAPI, profileAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CATEGORIES = [
  'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
  'Content Writing', 'Video Editing', 'Social Media', 'Data Entry',
  'Virtual Assistant', 'Translation', 'Tutoring', 'Photography',
  'Music & Audio', 'Marketing', 'Delivery', 'Other'
];

const AVAILABILITY_OPTIONS = ['Full-time', 'Part-time', 'Weekends only', 'Flexible'];

const quickActions = [
  { icon: Search, label: 'Find gigs', prompt: 'find_gigs', requiresFreelancer: true },
  { icon: FileText, label: 'Post a gig', prompt: 'post_gig', requiresAuth: true },
  { icon: UserPlus, label: 'Become freelancer', prompt: 'register_freelancer', requiresAuth: true },
  { icon: Lightbulb, label: 'Help me', prompt: 'help' },
];

// Wizard configurations
const GIG_WIZARD_STEPS = [
  { key: 'title', question: "What's the title of your gig?", type: 'text', placeholder: 'e.g., Build a React landing page' },
  { key: 'description', question: "Describe what you need done:", type: 'textarea', placeholder: 'Include requirements, deliverables, and any specific details...' },
  { key: 'category', question: "What category does this fall under?", type: 'category', options: CATEGORIES },
  { key: 'custom_category', question: "What's your custom category?", type: 'text', placeholder: 'Enter your custom category', conditional: (data) => data.category === 'Other' },
  { key: 'location', question: "Where is this gig based? (or type 'Remote')", type: 'text', placeholder: 'e.g., Dhaka, Remote' },
  { key: 'budget_min', question: "What's your minimum budget? (in USD)", type: 'number', placeholder: '50' },
  { key: 'budget_max', question: "And the maximum budget? (in USD)", type: 'number', placeholder: '200' },
  { key: 'duration_start', question: "When should this start?", type: 'date' },
  { key: 'duration_end', question: "And when's the deadline?", type: 'date' },
  { key: 'people_needed', question: "How many people do you need?", type: 'number', placeholder: '1' },
  { key: 'is_urgent', question: "Is this urgent?", type: 'select', options: ['No', 'Yes'] },
];

const FREELANCER_WIZARD_STEPS = [
  { key: 'categories', question: "What skills/services do you offer? (Select your categories)", type: 'multi-category', options: CATEGORIES },
  { key: 'custom_category', question: "What's your custom skill/category?", type: 'text', placeholder: 'Enter your custom skill', conditional: (data) => data.categories?.includes('Other') },
  { key: 'availability', question: "What's your availability?", type: 'select', options: AVAILABILITY_OPTIONS },
  { key: 'location', question: "Where are you located?", type: 'text', placeholder: 'e.g., Dhaka, Bangladesh' },
  { key: 'bio', question: "Tell us about yourself and your experience:", type: 'textarea', placeholder: 'Share your background, expertise, and what makes you great...' },
  { key: 'hourly_rate', question: "What's your hourly rate? (in USD, optional - press Enter to skip)", type: 'number', placeholder: '25', optional: true },
];

export const AIChat = ({ isOpen, onClose, isFullPage = false }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm Ishan, your Perfect Gigs assistant. I can help you post gigs, find work, register as a freelancer, and more. What would you like to do today?"
    }
  ]);
  const [conversationHistory, setConversationHistory] = useState([]); // Store last 30 messages for AI context
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wizardMode, setWizardMode] = useState(null); // 'post_gig' | 'find_gigs' | 'register_freelancer' | null
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState({});
  const [userTone, setUserTone] = useState('casual');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const { isAuthenticated, user, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, wizardStep]);

  // Update conversation history (keep last 30)
  const updateConversationHistory = (role, content) => {
    setConversationHistory(prev => {
      const updated = [...prev, { role, content }];
      return updated.slice(-30); // Keep last 30 messages
    });
  };

  // Detect user tone
  const detectTone = (text) => {
    const genZWords = ['fr', 'no cap', 'lowkey', 'highkey', 'bruh', 'ngl', 'ong', 'slay', 'bet', 'vibe', 'lit', 'fire', 'yo', 'lol', 'lmao'];
    const formalWords = ['please', 'kindly', 'would you', 'could you', 'I would like', 'I am looking', 'require', 'seeking', 'appreciate'];
    
    const lowerText = text.toLowerCase();
    
    if (genZWords.some(word => lowerText.includes(word))) return 'genz';
    if (formalWords.some(word => lowerText.includes(word))) return 'formal';
    return 'casual';
  };

  // Get toned response
  const getTonedResponse = (baseResponse, tone) => {
    if (tone === 'genz') {
      return baseResponse
        .replace(/Great!/g, "Yoo that's fire!")
        .replace(/Perfect!/g, "No cap, perfect!")
        .replace(/Got it!/g, "Bet!")
        .replace(/Awesome!/g, "Slay!")
        .replace(/Thank you/g, "Thanks fam");
    } else if (tone === 'formal') {
      return baseResponse
        .replace(/Got it!/g, "Understood.")
        .replace(/Great!/g, "Excellent.")
        .replace(/Perfect!/g, "Very well.")
        .replace(/Hey!/g, "Hello,")
        .replace(/Awesome!/g, "Wonderful.");
    }
    return baseResponse;
  };

  const addAssistantMessage = (content, inputConfig = null, extra = {}) => {
    const tonedContent = getTonedResponse(content, userTone);
    const newMsg = { role: 'assistant', content: tonedContent, inputConfig, ...extra };
    setMessages(prev => [...prev, newMsg]);
    updateConversationHistory('assistant', tonedContent);
  };

  const addUserMessage = (content) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
    updateConversationHistory('user', content);
  };

  const getCurrentWizardSteps = () => {
    if (wizardMode === 'post_gig') return GIG_WIZARD_STEPS;
    if (wizardMode === 'register_freelancer') return FREELANCER_WIZARD_STEPS;
    return [];
  };

  const getNextStepIndex = (currentIndex, data, steps) => {
    let nextIndex = currentIndex + 1;
    while (nextIndex < steps.length) {
      const step = steps[nextIndex];
      if (step.conditional && !step.conditional(data)) {
        nextIndex++;
      } else {
        break;
      }
    }
    return nextIndex;
  };

  const handleQuickAction = (action) => {
    if (action.requiresAuth && !isAuthenticated) {
      addAssistantMessage("You need to sign in first to do that! Would you like to sign in now?");
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '',
        action: { type: 'AUTH_REQUIRED' }
      }]);
      return;
    }

    if (action.requiresFreelancer && !user?.is_freelancer) {
      addAssistantMessage("To find gigs, you need to be registered as a freelancer first. Want me to help you register right now? I'll guide you through it step by step!");
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '',
        action: { type: 'OFFER_FREELANCER_REGISTRATION' }
      }]);
      return;
    }

    addUserMessage(action.label);

    switch (action.prompt) {
      case 'post_gig':
        startGigWizard();
        break;
      case 'find_gigs':
        startFindGigsWizard();
        break;
      case 'register_freelancer':
        startFreelancerWizard();
        break;
      case 'help':
        addAssistantMessage("I can help you with:\n\n• **Post a gig** - Create a new job posting (I'll guide you step by step)\n• **Find gigs** - Browse opportunities matching your skills (freelancers only)\n• **Become a freelancer** - Register your skills and start applying\n• **Update profile** - Help you improve your profile\n• **Search freelancers** - Find talented people for your project\n\nJust tell me what you need and I'll take care of it!");
        break;
      default:
        break;
    }
  };

  const startGigWizard = () => {
    setWizardMode('post_gig');
    setWizardStep(0);
    setWizardData({});
    setSelectedCategories([]);
    const step = GIG_WIZARD_STEPS[0];
    addAssistantMessage(`Great! Let's create your gig. ${step.question}`, { 
      type: step.type, 
      placeholder: step.placeholder,
      options: step.options 
    });
  };

  const startFreelancerWizard = () => {
    setWizardMode('register_freelancer');
    setWizardStep(0);
    setWizardData({});
    setSelectedCategories([]);
    const step = FREELANCER_WIZARD_STEPS[0];
    addAssistantMessage(`Awesome! Let's get you set up as a freelancer. ${step.question}\n\n(You can select multiple categories - click the ones that apply, then click "Done" when finished)`, { 
      type: step.type, 
      placeholder: step.placeholder,
      options: step.options 
    });
  };

  const startFindGigsWizard = () => {
    setWizardMode('find_gigs');
    addAssistantMessage("What kind of gigs are you looking for? Enter a category or keyword:", { 
      type: 'text', 
      placeholder: 'e.g., Web Development, design, marketing...' 
    });
  };

  const handleCategorySelect = (category) => {
    const steps = getCurrentWizardSteps();
    const currentStep = steps[wizardStep];
    
    if (currentStep.type === 'multi-category') {
      setSelectedCategories(prev => {
        if (prev.includes(category)) {
          return prev.filter(c => c !== category);
        } else {
          return [...prev, category];
        }
      });
    } else {
      // Single category selection
      handleWizardInput(category);
    }
  };

  const handleMultiCategoryDone = () => {
    if (selectedCategories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }
    handleWizardInput(selectedCategories.join(', '), selectedCategories);
  };

  const handleWizardInput = async (value, arrayValue = null) => {
    const detectedTone = detectTone(value);
    if (detectedTone !== userTone) setUserTone(detectedTone);

    addUserMessage(value);
    setInput('');

    const steps = getCurrentWizardSteps();
    const currentStep = steps[wizardStep];
    
    let processedValue = arrayValue || value;
    
    // Process value based on type
    if (currentStep.key === 'is_urgent') {
      processedValue = value.toLowerCase() === 'yes';
    } else if (currentStep.type === 'number') {
      processedValue = value.trim() === '' && currentStep.optional ? null : (parseFloat(value) || (currentStep.optional ? null : 1));
    }

    const newData = { ...wizardData, [currentStep.key]: processedValue };
    setWizardData(newData);

    // Get next step
    const nextIndex = getNextStepIndex(wizardStep, newData, steps);

    if (nextIndex < steps.length) {
      setWizardStep(nextIndex);
      setSelectedCategories([]);
      const nextStep = steps[nextIndex];
      
      let prompt = `Got it! ${nextStep.question}`;
      if (nextStep.type === 'multi-category') {
        prompt += "\n\n(Select all that apply, then click 'Done')";
      }
      
      setTimeout(() => {
        addAssistantMessage(prompt, { 
          type: nextStep.type, 
          placeholder: nextStep.placeholder,
          options: nextStep.options 
        });
      }, 400);
    } else {
      // Wizard complete - submit
      await submitWizard(newData);
    }
  };

  const submitWizard = async (data) => {
    setIsLoading(true);
    
    try {
      if (wizardMode === 'post_gig') {
        const category = data.category === 'Other' && data.custom_category 
          ? data.custom_category 
          : data.category;
        
        const gigData = {
          title: data.title,
          description: data.description,
          category: category,
          location: data.location,
          budget_min: parseFloat(data.budget_min),
          budget_max: parseFloat(data.budget_max),
          duration_start: data.duration_start,
          duration_end: data.duration_end,
          people_needed: parseInt(data.people_needed) || 1,
          is_urgent: data.is_urgent === true || data.is_urgent === 'Yes'
        };
        
        const response = await gigsAPI.create(gigData);
        if (response.data.success) {
          addAssistantMessage("Your gig has been posted successfully! 🎉\n\nHere's a summary:\n• **Title:** " + gigData.title + "\n• **Budget:** $" + gigData.budget_min + "-$" + gigData.budget_max + "\n• **Category:** " + category + "\n\nFreelancers can now see and apply to your gig!");
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '',
            action: { type: 'VIEW_GIG', gigId: response.data.gig.id }
          }]);
          toast.success('Gig posted successfully!');
        }
      } else if (wizardMode === 'register_freelancer') {
        let categories = data.categories;
        if (Array.isArray(categories)) {
          categories = categories.map(c => c === 'Other' && data.custom_category ? data.custom_category : c);
        } else if (typeof categories === 'string') {
          categories = categories.split(', ').map(c => c === 'Other' && data.custom_category ? data.custom_category : c);
        }
        
        const freelancerData = {
          categories: categories,
          availability: data.availability,
          location: data.location,
          bio: data.bio,
          hourly_rate: data.hourly_rate || null
        };
        
        const response = await profileAPI.registerFreelancer(freelancerData);
        if (response.data.success) {
          // Update local user state
          updateUser({ is_freelancer: true, ...response.data.profile });
          
          addAssistantMessage("Congratulations! You're now registered as a freelancer! 🎉\n\nHere's your profile summary:\n• **Skills:** " + categories.join(', ') + "\n• **Availability:** " + data.availability + "\n• **Location:** " + data.location + "\n\nYou can now browse and apply to gigs. Would you like me to find some gigs matching your skills?");
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '',
            action: { type: 'FIND_MATCHING_GIGS' }
          }]);
          toast.success('Freelancer registration complete!');
        }
      }
    } catch (error) {
      console.error('Wizard submit error:', error);
      const errorMsg = error.response?.data?.detail || 'Something went wrong';
      addAssistantMessage(`Oops! ${errorMsg}. Would you like to try again?`);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
      setWizardMode(null);
      setWizardStep(0);
      setWizardData({});
      setSelectedCategories([]);
    }
  };

  const handleFindGigs = async (query) => {
    setIsLoading(true);
    try {
      const response = await gigsAPI.list({ category: query, limit: 5 });
      if (response.data.success && response.data.gigs.length > 0) {
        const gigs = response.data.gigs;
        addAssistantMessage(`Found ${gigs.length} gigs matching "${query}":`);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '',
          gigs: gigs
        }]);
      } else {
        addAssistantMessage(`No gigs found for "${query}". Try a different search term!\n\nPopular categories: Web Development, Mobile Development, Content Writing, Graphic Design, Video Editing`);
      }
    } catch (error) {
      addAssistantMessage("Couldn't fetch gigs right now. Please try again!");
    } finally {
      setIsLoading(false);
      setWizardMode(null);
    }
  };

  const handleSend = async (text = input) => {
    if (!text.trim()) return;
    
    // Handle wizard mode
    if (wizardMode === 'find_gigs') {
      addUserMessage(text);
      setInput('');
      await handleFindGigs(text);
      return;
    }
    
    if (wizardMode) {
      handleWizardInput(text);
      return;
    }

    const detectedTone = detectTone(text);
    if (detectedTone !== userTone) setUserTone(detectedTone);

    addUserMessage(text);
    setInput('');
    setIsLoading(true);

    // Check for intent locally first
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('post') && (lowerText.includes('gig') || lowerText.includes('job'))) {
      if (!isAuthenticated) {
        addAssistantMessage("You'll need to sign in first to post a gig. Would you like to sign in?");
        setMessages(prev => [...prev, { role: 'assistant', content: '', action: { type: 'AUTH_REQUIRED' } }]);
      } else {
        startGigWizard();
      }
      setIsLoading(false);
      return;
    }
    
    if ((lowerText.includes('register') || lowerText.includes('become') || lowerText.includes('sign up as')) && lowerText.includes('freelancer')) {
      if (!isAuthenticated) {
        addAssistantMessage("You'll need to sign in first to register as a freelancer. Would you like to sign in?");
        setMessages(prev => [...prev, { role: 'assistant', content: '', action: { type: 'AUTH_REQUIRED' } }]);
      } else if (user?.is_freelancer) {
        addAssistantMessage("You're already registered as a freelancer! Would you like to find some gigs instead?");
      } else {
        startFreelancerWizard();
      }
      setIsLoading(false);
      return;
    }
    
    if ((lowerText.includes('find') || lowerText.includes('search') || lowerText.includes('look for')) && (lowerText.includes('gig') || lowerText.includes('job') || lowerText.includes('work'))) {
      if (!user?.is_freelancer) {
        addAssistantMessage("To find gigs, you need to be registered as a freelancer. Want me to help you register? I'll guide you through it right here!");
        setMessages(prev => [...prev, { role: 'assistant', content: '', action: { type: 'OFFER_FREELANCER_REGISTRATION' } }]);
      } else {
        startFindGigsWizard();
      }
      setIsLoading(false);
      return;
    }

    // Send to AI with conversation history
    try {
      const response = await aiAPI.chat({
        message: text,
        context: { 
          current_page: window.location.pathname,
          user_tone: userTone,
          is_freelancer: user?.is_freelancer,
          is_authenticated: isAuthenticated,
          conversation_history: conversationHistory.slice(-30)
        }
      });

      if (response.data.success) {
        const aiResponse = getTonedResponse(response.data.response, userTone);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: aiResponse,
          action: response.data.action
        }]);
        updateConversationHistory('assistant', aiResponse);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      addAssistantMessage("I'm having trouble connecting right now. But I can still help! Try saying 'post a gig', 'find gigs', or 'register as freelancer'.");
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
      case 'OFFER_FREELANCER_REGISTRATION':
        if (isAuthenticated) {
          startFreelancerWizard();
        } else {
          navigate('/auth', { state: { returnTo: '/dashboard' } });
          if (!isFullPage) onClose();
        }
        break;
      case 'VIEW_GIG':
        navigate(`/gigs/${action.gigId}`);
        if (!isFullPage) onClose();
        break;
      case 'FIND_MATCHING_GIGS':
        startFindGigsWizard();
        break;
      case 'SEARCH_GIGS':
        navigate('/gigs', { state: { filters: action.data } });
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
    // Multi-category selection
    if (inputConfig.type === 'multi-category' && inputConfig.options) {
      return (
        <div className="w-full space-y-2">
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-secondary rounded-lg">
            {inputConfig.options.map(cat => (
              <Button
                key={cat}
                variant={selectedCategories.includes(cat) ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategorySelect(cat)}
                className={`text-xs h-7 ${selectedCategories.includes(cat) ? 'bg-primary' : 'border-border'}`}
              >
                {selectedCategories.includes(cat) && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {cat}
              </Button>
            ))}
          </div>
          <Button
            onClick={handleMultiCategoryDone}
            disabled={selectedCategories.length === 0}
            className="w-full h-9 bg-accent hover:bg-accent/90"
          >
            Done ({selectedCategories.length} selected)
          </Button>
        </div>
      );
    }

    // Single category selection
    if (inputConfig.type === 'category' && inputConfig.options) {
      return (
        <Select onValueChange={(value) => handleWizardInput(value)}>
          <SelectTrigger className="flex-1 h-10 bg-secondary border-border text-sm">
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent>
            {inputConfig.options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

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
          className="flex-1 min-h-[80px] bg-secondary border-border text-sm resize-none"
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
                      message.role === 'user' ? 'bg-primary/10' : 'bg-secondary'
                    }`}>
                      {message.role === 'user' 
                        ? <User className="w-3.5 h-3.5 text-primary" />
                        : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </div>
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'text-right' : ''}`}>
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
                        {gig.is_urgent && <span className="text-xs text-red-400">🚨 Urgent</span>}
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
                      {message.action.type === 'OFFER_FREELANCER_REGISTRATION' && 'Yes, Register Me!'}
                      {message.action.type === 'VIEW_GIG' && 'View Gig'}
                      {message.action.type === 'FIND_MATCHING_GIGS' && 'Find Gigs for Me'}
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
          {inputConfig.type !== 'multi-category' && (
            <Button
              onClick={() => handleSend()}
              disabled={(!input.trim() && inputConfig.type !== 'select' && inputConfig.type !== 'category') || isLoading}
              className="h-10 w-10 bg-primary hover:bg-primary/90"
              size="icon"
              data-testid="send-message-btn"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        {wizardMode && (
          <p className="text-xs text-muted-foreground mt-2">
            {wizardMode === 'post_gig' && `Posting gig - Step ${wizardStep + 1} of ${GIG_WIZARD_STEPS.filter(s => !s.conditional || s.conditional(wizardData)).length}`}
            {wizardMode === 'register_freelancer' && `Freelancer setup - Step ${wizardStep + 1}`}
            {wizardMode === 'find_gigs' && 'Searching gigs...'}
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
            className="fixed bottom-4 right-4 w-[420px] h-[600px] z-50 shadow-2xl"
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
