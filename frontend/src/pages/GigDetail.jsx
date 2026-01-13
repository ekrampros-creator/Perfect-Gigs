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
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!gig) return null;

  const isOwner = user?.id === gig.created_by;

  return (
    <div className="min-h-screen py-8 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/gigs')}
          className="mb-6 text-muted-foreground hover:text-foreground h-8 px-2 text-sm"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Gigs
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">
                {gig.category}
              </Badge>
              {gig.is_urgent && (
                <Badge variant="destructive" className="text-xs">
                  Urgent
                </Badge>
              )}
              <Badge variant="outline" className="text-xs capitalize">
                {gig.status}
              </Badge>
            </div>

            <h1 className="font-heading font-semibold text-xl md:text-2xl text-foreground mb-4">
              {gig.title}
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
          <div className="p-6">
            <h2 className="font-medium text-foreground mb-3">Description</h2>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap mb-6">
              {gig.description}
            </p>

            {/* Timeline */}
            <div className="bg-secondary rounded-lg p-4 mb-6">
              <h3 className="font-medium text-foreground text-sm mb-2">Timeline</h3>
              <div className="flex items-center gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="text-foreground">
                    {new Date(gig.duration_start).toLocaleDateString('en-US', { 
                      month: 'short', day: 'numeric', year: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="h-px flex-1 bg-border" />
                <div>
                  <p className="text-xs text-muted-foreground">End</p>
                  <p className="text-foreground">
                    {new Date(gig.duration_end).toLocaleDateString('en-US', { 
                      month: 'short', day: 'numeric', year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Posted By */}
            {gig.profiles && (
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg mb-6">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {gig.profiles.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-foreground font-medium text-sm">{gig.profiles.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span>{gig.profiles.rating || 'New'} rating</span>
                  </div>
                </div>
                {!isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/messages/${gig.created_by}`)}
                    className="h-8 text-xs"
                    data-testid="contact-btn"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Contact
                  </Button>
                )}
              </div>
            )}

            {/* Apply Section */}
            {!isOwner && gig.status === 'open' && (
              <div className="border-t border-border pt-6">
                {hasApplied ? (
                  <div className="flex items-center gap-2 p-4 bg-accent/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-foreground font-medium text-sm">Application Submitted!</p>
                      <p className="text-xs text-muted-foreground">
                        The gig owner will review your application
                      </p>
                    </div>
                  </div>
                ) : showApplyForm ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-foreground font-medium text-sm mb-2">
                        Cover Letter (Optional)
                      </label>
                      <Textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Introduce yourself and explain why you're a good fit..."
                        className="min-h-[120px] bg-secondary border-border text-sm"
                        data-testid="cover-letter-input"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowApplyForm(false)}
                        className="h-9 text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleApply}
                        disabled={applying}
                        className="h-9 text-sm bg-accent hover:bg-accent/90"
                        data-testid="submit-application-btn"
                      >
                        {applying && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                        <Send className="w-4 h-4 mr-1" />
                        Submit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => isAuthenticated ? setShowApplyForm(true) : navigate('/auth', { state: { returnTo: `/gigs/${gigId}` } })}
                    className="w-full h-11 bg-accent hover:bg-accent/90 font-medium"
                    data-testid="apply-btn"
                  >
                    Apply for this Gig
                  </Button>
                )}
              </div>
            )}

            {isOwner && (
              <div className="border-t border-border pt-6">
                <Button
                  onClick={() => navigate(`/gigs/${gigId}/applications`)}
                  className="w-full h-11 bg-primary hover:bg-primary/90 font-medium"
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
