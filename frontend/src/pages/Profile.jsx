import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, MapPin, Star, Edit2, Save, Loader2, 
  Briefcase, Award
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { profileAPI, reviewsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    skills: []
  });
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { returnTo: '/profile' } });
      return;
    }
    
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        skills: user.skills || []
      });
      loadReviews();
    }
  }, [isAuthenticated, user, navigate]);

  const loadReviews = async () => {
    try {
      const response = await reviewsAPI.getForUser(user.id);
      if (response.data.success) {
        setReviews(response.data.reviews);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await profileAPI.update(formData);
      if (response.data.success) {
        updateUser(response.data.profile);
        toast.success('Profile updated!');
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen py-8 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border overflow-hidden mb-6"
        >
          {/* Header */}
          <div className="relative h-24 bg-gradient-to-r from-primary/20 to-accent/10">
            <div className="absolute -bottom-12 left-6">
              <Avatar className="w-24 h-24 border-4 border-background">
                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="pt-16 px-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
              <div>
                {editing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="text-lg font-heading font-semibold bg-secondary border-border text-foreground mb-1 h-9"
                    data-testid="name-input"
                  />
                ) : (
                  <h1 className="font-heading font-semibold text-xl text-foreground mb-1">
                    {user.name}
                  </h1>
                )}
                <p className="text-muted-foreground text-sm">{user.email}</p>
                
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-foreground text-sm font-medium">
                      {user.rating || 'New'} ({user.total_reviews || 0} reviews)
                    </span>
                  </div>
                  {user.is_freelancer && (
                    <Badge className="bg-accent/20 text-accent border-0 text-xs">
                      Freelancer
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setEditing(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      className="h-8 text-xs bg-accent hover:bg-accent/90"
                      data-testid="save-profile-btn"
                    >
                      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                      <Save className="w-3.5 h-3.5 mr-1" />
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    className="h-8 text-xs"
                    data-testid="edit-profile-btn"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="mb-5">
              <Label className="text-muted-foreground text-xs mb-1.5 block">Bio</Label>
              {editing ? (
                <Textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="bg-secondary border-border text-sm min-h-[80px]"
                  data-testid="bio-input"
                />
              ) : (
                <p className="text-foreground text-sm">{user.bio || 'No bio yet'}</p>
              )}
            </div>

            {/* Location */}
            <div className="mb-5">
              <Label className="text-muted-foreground text-xs mb-1.5 block">Location</Label>
              {editing ? (
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="Your city"
                    className="pl-10 bg-secondary border-border text-sm h-9"
                    data-testid="location-input"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-foreground text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {user.location || 'Not set'}
                </div>
              )}
            </div>

            {/* Skills */}
            <div>
              <Label className="text-muted-foreground text-xs mb-1.5 block">Skills</Label>
              {editing && (
                <div className="flex gap-2 mb-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add a skill"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    className="bg-secondary border-border text-sm h-9"
                    data-testid="skill-input"
                  />
                  <Button onClick={addSkill} className="h-9 text-sm">Add</Button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {formData.skills.length === 0 && !editing ? (
                  <span className="text-muted-foreground text-sm">No skills added</span>
                ) : (
                  formData.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => editing && removeSkill(skill)}
                    >
                      {skill}
                      {editing && ' ×'}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Freelancer CTA */}
        {!user.is_freelancer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-5 mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-medium text-sm">Want to find gig work?</h3>
                <p className="text-muted-foreground text-xs">
                  Register as a freelancer to get matched
                </p>
              </div>
              <Button
                onClick={() => navigate('/freelancer/register')}
                className="h-8 text-xs bg-accent hover:bg-accent/90"
                data-testid="register-freelancer-btn"
              >
                Register
              </Button>
            </div>
          </motion.div>
        )}

        {/* Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h2 className="font-heading font-semibold text-lg text-foreground mb-4">
            Reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {review.profiles?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-foreground font-medium text-xs">{review.profiles?.name}</p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-muted-foreground text-sm">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
