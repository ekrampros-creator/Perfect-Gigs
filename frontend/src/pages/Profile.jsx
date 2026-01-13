import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, MapPin, Star, Edit2, Save, Loader2, 
  Briefcase, Award, CheckCircle
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
    <div className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden mb-8"
        >
          {/* Header */}
          <div className="relative h-32 bg-gradient-to-r from-primary/30 to-accent/10">
            <div className="absolute -bottom-16 left-8">
              <Avatar className="w-32 h-32 border-4 border-[#050505]">
                <AvatarFallback className="bg-primary text-3xl text-white">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="pt-20 px-8 pb-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                {editing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="text-2xl font-unbounded font-bold bg-white/5 border-white/10 text-white mb-2"
                    data-testid="name-input"
                  />
                ) : (
                  <h1 className="font-unbounded font-bold text-2xl text-white mb-2">
                    {user.name}
                  </h1>
                )}
                <p className="text-muted-foreground">{user.email}</p>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-white font-medium">
                      {user.rating || 'New'} ({user.total_reviews || 0} reviews)
                    </span>
                  </div>
                  {user.is_freelancer && (
                    <Badge className="bg-accent/20 text-accent border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
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
                      className="border-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                      data-testid="save-profile-btn"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    className="border-white/10"
                    data-testid="edit-profile-btn"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="mb-6">
              <Label className="text-muted-foreground text-sm mb-2 block">Bio</Label>
              {editing ? (
                <Textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                  data-testid="bio-input"
                />
              ) : (
                <p className="text-white">{user.bio || 'No bio yet'}</p>
              )}
            </div>

            {/* Location */}
            <div className="mb-6">
              <Label className="text-muted-foreground text-sm mb-2 block">Location</Label>
              {editing ? (
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="Your city"
                    className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                    data-testid="location-input"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {user.location || 'Not set'}
                </div>
              )}
            </div>

            {/* Skills */}
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">Skills</Label>
              {editing && (
                <div className="flex gap-2 mb-3">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add a skill"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                    data-testid="skill-input"
                  />
                  <Button onClick={addSkill} className="bg-primary">Add</Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {formData.skills.length === 0 && !editing ? (
                  <span className="text-muted-foreground">No skills added</span>
                ) : (
                  formData.skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-primary/20 text-primary border-0 cursor-pointer"
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

        {/* Freelancer Actions */}
        {!user.is_freelancer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-8 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">Want to find gig work?</h3>
                <p className="text-muted-foreground text-sm">
                  Register as a freelancer to get matched with opportunities
                </p>
              </div>
              <Button
                onClick={() => navigate('/freelancer/register')}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                data-testid="register-freelancer-btn"
              >
                Register Now
              </Button>
            </div>
          </motion.div>
        )}

        {/* Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-8"
        >
          <h2 className="font-unbounded font-semibold text-xl text-white mb-6">
            Reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, index) => (
                <div key={review.id} className="p-4 glass-light rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {review.profiles?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{review.profiles?.name}</p>
                      <div className="flex items-center gap-1">
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
