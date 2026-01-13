import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Loader2, User, Star, MessageSquare, 
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { gigsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const GigApplications = () => {
  const { gigId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { returnTo: `/gigs/${gigId}/applications` } });
      return;
    }
    loadApplications();
  }, [isAuthenticated, gigId, navigate]);

  const loadApplications = async () => {
    try {
      const response = await gigsAPI.getApplications(gigId);
      if (response.data.success) {
        setApplications(response.data.applications);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (applicationId) => {
    try {
      await gigsAPI.acceptApplication(applicationId);
      toast.success('Application accepted!');
      loadApplications();
    } catch (error) {
      console.error('Error accepting:', error);
      toast.error('Failed to accept application');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(`/gigs/${gigId}`)}
          className="mb-6 text-muted-foreground hover:text-foreground h-8 px-2 text-sm"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Gig
        </Button>

        <div className="mb-6">
          <h1 className="font-heading font-semibold text-2xl text-foreground mb-1">
            Applications
          </h1>
          <p className="text-muted-foreground text-sm">
            {applications.length} applicant{applications.length !== 1 ? 's' : ''}
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-foreground font-medium mb-1">No applications yet</h3>
            <p className="text-muted-foreground text-sm">
              Share your gig to get more applicants
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl border border-border p-5"
                data-testid={`application-${app.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Avatar className="w-11 h-11">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {app.profiles?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-foreground font-medium text-sm">{app.profiles?.name}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            app.status === 'accepted' ? 'bg-accent/20 text-accent' :
                            app.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}
                        >
                          {app.status === 'accepted' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                           app.status === 'rejected' ? <XCircle className="w-3 h-3 mr-1" /> :
                           <Clock className="w-3 h-3 mr-1" />}
                          {app.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span>{app.profiles?.rating || 'New'} rating</span>
                      </div>
                      
                      {app.profiles?.bio && (
                        <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                          {app.profiles.bio}
                        </p>
                      )}
                      
                      {app.profiles?.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {app.profiles.skills.slice(0, 4).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-border">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {app.cover_letter && (
                        <div className="p-3 bg-secondary rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Cover Letter:</p>
                          <p className="text-foreground text-sm">{app.cover_letter}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/messages/${app.applicant_id}`)}
                      className="h-8 text-xs flex-1 md:flex-none"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1" />
                      Chat
                    </Button>
                    {app.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleAccept(app.id)}
                        className="h-8 text-xs bg-accent hover:bg-accent/90 flex-1 md:flex-none"
                        data-testid={`accept-${app.id}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Accept
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GigApplications;
