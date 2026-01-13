import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Clock, Briefcase, DollarSign, ArrowLeft, 
  Loader2, Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { profileAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const categories = [
  'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
  'Content Writing', 'Video Editing', 'Social Media', 'Data Entry',
  'Virtual Assistant', 'Translation', 'Tutoring', 'Photography',
  'Music & Audio', 'Marketing', 'Delivery', 'Other'
];

const availabilityOptions = [
  'Full-time', 'Part-time', 'Weekends only', 'Flexible', 'Project-based'
];

export const FreelancerRegister = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [formData, setFormData] = useState({
    availability: '',
    location: '',
    bio: '',
    hourly_rate: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { returnTo: '/freelancer/register' } });
      return;
    }
    
    if (user?.is_freelancer) {
      toast.info('You are already registered as a freelancer');
      navigate('/dashboard');
    }
    
    if (user) {
      setFormData(prev => ({
        ...prev,
        location: user.location || '',
        bio: user.bio || ''
      }));
    }
  }, [isAuthenticated, user, navigate]);

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }
    
    if (!formData.availability || !formData.location || !formData.bio) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await profileAPI.registerFreelancer({
        categories: selectedCategories,
        availability: formData.availability,
        location: formData.location,
        bio: formData.bio,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null
      });

      if (response.data.success) {
        updateUser(response.data.profile);
        toast.success('Successfully registered as a freelancer!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error registering:', error);
      toast.error(error.response?.data?.detail || 'Registration failed');
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
            Become a Freelancer
          </h1>
          <p className="text-muted-foreground text-sm">
            Set up your freelancer profile to get matched with gigs
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-card rounded-xl border border-border p-6 space-y-6"
        >
          <div className="space-y-3">
            <Label className="text-sm">
              What kind of work are you open to? *
            </Label>
            <p className="text-xs text-muted-foreground">
              Select all categories that match your skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(category => (
                <Badge
                  key={category}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  className={`cursor-pointer text-xs transition-colors ${
                    selectedCategories.includes(category)
                      ? 'bg-primary text-primary-foreground'
                      : 'border-border text-foreground hover:bg-secondary'
                  }`}
                  onClick={() => toggleCategory(category)}
                  data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {selectedCategories.includes(category) && (
                    <Check className="w-3 h-3 mr-1" />
                  )}
                  {category}
                </Badge>
              ))}
            </div>
            {selectedCategories.length > 0 && (
              <p className="text-xs text-accent">
                {selectedCategories.length} selected
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Availability *</Label>
            <Select
              value={formData.availability}
              onValueChange={(value) => handleChange('availability', value)}
            >
              <SelectTrigger 
                className="h-10 bg-secondary border-border text-sm"
                data-testid="availability-select"
              >
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select your availability" />
              </SelectTrigger>
              <SelectContent>
                {availabilityOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
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
                placeholder="Your city or area"
                className="pl-10 h-10 bg-secondary border-border text-sm"
                data-testid="location-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-sm">Professional Bio *</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell potential clients about your skills and experience..."
              className="min-h-[100px] bg-secondary border-border text-sm"
              data-testid="bio-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rate" className="text-sm">Hourly Rate (Optional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="rate"
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => handleChange('hourly_rate', e.target.value)}
                placeholder="Your hourly rate in USD"
                min="0"
                className="pl-10 h-10 bg-secondary border-border text-sm"
                data-testid="rate-input"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to negotiate per project
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-accent hover:bg-accent/90 font-medium"
            data-testid="register-btn"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            <Briefcase className="w-4 h-4 mr-2" />
            Register as Freelancer
          </Button>
        </motion.form>
      </div>
    </div>
  );
};

export default FreelancerRegister;
