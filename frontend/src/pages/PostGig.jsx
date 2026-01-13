import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, MapPin, DollarSign, Calendar, Users, 
  Zap, ArrowLeft, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { gigsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const categories = [
  'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
  'Content Writing', 'Video Editing', 'Social Media', 'Data Entry',
  'Virtual Assistant', 'Translation', 'Tutoring', 'Photography',
  'Music & Audio', 'Marketing', 'Delivery', 'Other'
];

export const PostGig = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  const prefill = location.state?.prefill || {};
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: prefill.title || '',
    description: prefill.description || '',
    category: prefill.category || '',
    location: prefill.location || '',
    budget_min: prefill.budget_min || '',
    budget_max: prefill.budget_max || '',
    duration_start: '',
    duration_end: '',
    people_needed: prefill.people_needed || 1,
    is_urgent: false
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { returnTo: '/post-gig' } });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.category || 
        !formData.location || !formData.budget_min || !formData.budget_max ||
        !formData.duration_start || !formData.duration_end) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await gigsAPI.create({
        ...formData,
        budget_min: parseFloat(formData.budget_min),
        budget_max: parseFloat(formData.budget_max),
        people_needed: parseInt(formData.people_needed)
      });

      if (response.data.success) {
        toast.success('Gig posted successfully!');
        navigate(`/gigs/${response.data.gig.id}`);
      }
    } catch (error) {
      console.error('Error posting gig:', error);
      toast.error(error.response?.data?.detail || 'Failed to post gig');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-6">
      <div className="max-w-xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-muted-foreground hover:text-foreground h-8 px-2 text-sm"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="font-heading font-semibold text-2xl text-foreground mb-1">
            Post a New Gig
          </h1>
          <p className="text-muted-foreground text-sm">
            Find the perfect freelancer for your project
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-card rounded-xl border border-border p-6 space-y-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm">Gig Title *</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Build a React landing page"
                className="pl-10 h-10 bg-secondary border-border text-sm"
                data-testid="title-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what you need done, requirements, deliverables..."
              className="min-h-[120px] bg-secondary border-border text-sm"
              data-testid="description-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger 
                  className="h-10 bg-secondary border-border text-sm"
                  data-testid="category-select"
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-sm">Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="City or Remote"
                  className="pl-10 h-10 bg-secondary border-border text-sm"
                  data-testid="location-input"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Budget Range (USD) *</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={formData.budget_min}
                  onChange={(e) => handleChange('budget_min', e.target.value)}
                  placeholder="Min"
                  min="0"
                  className="pl-10 h-10 bg-secondary border-border text-sm"
                  data-testid="budget-min-input"
                />
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => handleChange('budget_max', e.target.value)}
                  placeholder="Max"
                  min="0"
                  className="pl-10 h-10 bg-secondary border-border text-sm"
                  data-testid="budget-max-input"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Duration *</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={formData.duration_start}
                  onChange={(e) => handleChange('duration_start', e.target.value)}
                  className="pl-10 h-10 bg-secondary border-border text-sm"
                  data-testid="start-date-input"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={formData.duration_end}
                  onChange={(e) => handleChange('duration_end', e.target.value)}
                  className="pl-10 h-10 bg-secondary border-border text-sm"
                  data-testid="end-date-input"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="people" className="text-sm">People Needed</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="people"
                  type="number"
                  value={formData.people_needed}
                  onChange={(e) => handleChange('people_needed', e.target.value)}
                  min="1"
                  className="pl-10 h-10 bg-secondary border-border text-sm"
                  data-testid="people-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Mark as Urgent</Label>
              <div className="flex items-center gap-3 h-10 px-3 bg-secondary border border-border rounded-md">
                <Zap className={`w-4 h-4 ${formData.is_urgent ? 'text-destructive' : 'text-muted-foreground'}`} />
                <span className="flex-1 text-sm text-muted-foreground">Urgent gig</span>
                <Switch
                  checked={formData.is_urgent}
                  onCheckedChange={(checked) => handleChange('is_urgent', checked)}
                  data-testid="urgent-switch"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-accent hover:bg-accent/90 font-medium"
            data-testid="submit-gig-btn"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Post Gig
          </Button>
        </motion.form>
      </div>
    </div>
  );
};

export default PostGig;
