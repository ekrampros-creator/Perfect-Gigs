import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Clock, Briefcase, DollarSign, ArrowLeft, 
  Loader2, CheckCircle
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
    
    // Pre-fill from user profile
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
    <div className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-muted-foreground hover:text-white"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-unbounded font-bold text-3xl text-white mb-2">
            Become a Freelancer
          </h1>
          <p className="text-muted-foreground">
            Set up your freelancer profile to start getting matched with gigs
          </p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-8 space-y-8"
        >
          {/* Categories */}
          <div className="space-y-4">
            <Label className="text-white">
              What kind of work are you open to? *
            </Label>
            <p className="text-sm text-muted-foreground">
              Select all categories that match your skills
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Badge
                  key={category}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    selectedCategories.includes(category)
                      ? 'bg-primary text-white border-primary'
                      : 'border-white/20 text-white hover:bg-white/5'
                  }`}
                  onClick={() => toggleCategory(category)}
                  data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {selectedCategories.includes(category) && (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  )}
                  {category}
                </Badge>
              ))}
            </div>
            {selectedCategories.length > 0 && (
              <p className="text-sm text-accent">
                {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
              </p>
            )}
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <Label className="text-white">Availability *</Label>
            <Select
              value={formData.availability}
              onValueChange={(value) => handleChange('availability', value)}
            >
              <SelectTrigger 
                className="h-12 bg-white/5 border-white/10 text-white"
                data-testid="availability-select"
              >
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select your availability" />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-white/10">
                {availabilityOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-white">Location *</Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Your city or area"
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                data-testid="location-input"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-white">Professional Bio *</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell potential clients about your skills, experience, and what makes you great at what you do..."
              className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
              data-testid="bio-input"
            />
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label htmlFor="rate" className="text-white">Hourly Rate (Optional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="rate"
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => handleChange('hourly_rate', e.target.value)}
                placeholder="Your hourly rate in USD"
                min="0"
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                data-testid="rate-input"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank if you prefer to negotiate per project
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-xl"
            data-testid="register-btn"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Briefcase className="w-4 h-4 mr-2" />
            )}
            Register as Freelancer
          </Button>
        </motion.form>
      </div>
    </div>
  );
};

export default FreelancerRegister;
