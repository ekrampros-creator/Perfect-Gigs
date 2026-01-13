import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Clock, DollarSign, Users, Zap, ArrowLeft, 
  Star, MessageSquare, Send, Loader2, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { gigsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const GigDetail = () => {
  const { gigId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    loadGig();
  }, [gigId]);

  const loadGig = async () => {
    try {
      const response = await gigsAPI.get(gigId);
      if (response.data.success) {
        setGig(response.data.gig);
      }
    } catch (error) {
      console.error('Error loading gig:', error);
      toast.error('Gig not found');
      navigate('/gigs');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { returnTo: `/gigs/${gigId}` } });
      return;
    }

    setApplying(true);
    try {
      await gigsAPI.apply(gigId, { cover_letter: coverLetter });
      toast.success('Application submitted successfully!');
      setHasApplied(true);
      setShowApplyForm(false);
    } catch (error) {
      console.error('Error applying:', error);
      toast.error(error.response?.data?.detail || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!gig) return null;

  const isOwner = user?.id === gig.created_by;

  return (
    <div className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/gigs')}
          className="mb-6 text-muted-foreground hover:text-white"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Gigs
        </Button>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/10">
            <div className="flex flex-wrap items-start gap-3 mb-4">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                {gig.category}
              </Badge>
              {gig.is_urgent && (
                <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-0">
                  <Zap className="w-3 h-3 mr-1" /> Urgent
                </Badge>
              )}
              <Badge variant="outline" className="border-white/20 text-white">
                {gig.status}
              </Badge>
            </div>

            <h1 className="font-unbounded font-bold text-2xl md:text-3xl text-white mb-4">
              {gig.title}
            </h1>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{gig.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>${gig.budget_min} - ${gig.budget_max}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{new Date(gig.duration_start).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{gig.people_needed} needed</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <h2 className="font-unbounded font-semibold text-lg text-white mb-4">
              Description
            </h2>
            <p className="text-muted-foreground whitespace-pre-wrap mb-8">
              {gig.description}
            </p>

            {/* Duration */}
            <div className="glass-light rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-white mb-3">Timeline</h3>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-white font-medium">
                    {new Date(gig.duration_start).toLocaleDateString('en-US', { 
                      weekday: 'short', month: 'short', day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="h-px flex-1 bg-white/10" />
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="text-white font-medium">
                    {new Date(gig.duration_end).toLocaleDateString('en-US', { 
                      weekday: 'short', month: 'short', day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Posted By */}
            {gig.profiles && (
              <div className="flex items-center gap-4 p-6 glass-light rounded-xl mb-8">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {gig.profiles.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-white font-medium">{gig.profiles.name}</p>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm text-muted-foreground">
                      {gig.profiles.rating || 'New'} rating
                    </span>
                  </div>
                </div>
                {!isOwner && (
                  <Button
                    variant="outline"
                    className="border-white/10 hover:bg-white/5"
                    onClick={() => navigate(`/messages/${gig.created_by}`)}
                    data-testid="contact-btn"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact
                  </Button>
                )}
              </div>
            )}

            {/* Apply Section */}
            {!isOwner && gig.status === 'open' && (
              <div className="border-t border-white/10 pt-8">
                {hasApplied ? (
                  <div className="flex items-center gap-3 p-6 bg-green-500/10 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="text-white font-medium">Application Submitted!</p>
                      <p className="text-sm text-muted-foreground">
                        The gig owner will review your application
                      </p>
                    </div>
                  </div>
                ) : showApplyForm ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white font-medium mb-2">
                        Cover Letter (Optional)
                      </label>
                      <Textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Introduce yourself and explain why you're a good fit for this gig..."
                        className="min-h-[150px] bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                        data-testid="cover-letter-input"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowApplyForm(false)}
                        className="border-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleApply}
                        disabled={applying}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        data-testid="submit-application-btn"
                      >
                        {applying ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Submit Application
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => isAuthenticated ? setShowApplyForm(true) : navigate('/auth', { state: { returnTo: `/gigs/${gigId}` } })}
                    className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-xl"
                    data-testid="apply-btn"
                  >
                    Apply for this Gig
                  </Button>
                )}
              </div>
            )}

            {/* Owner Actions */}
            {isOwner && (
              <div className="border-t border-white/10 pt-8">
                <Button
                  onClick={() => navigate(`/gigs/${gigId}/applications`)}
                  className="w-full h-14 bg-primary hover:bg-primary/90 font-semibold rounded-xl"
                  data-testid="view-applications-btn"
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Applications ({gig.applications_count || 0})
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GigDetail;
