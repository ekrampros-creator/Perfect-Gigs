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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(`/gigs/${gigId}`)}
          className="mb-6 text-muted-foreground hover:text-white"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Gig
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-unbounded font-bold text-3xl text-white mb-2">
            Applications
          </h1>
          <p className="text-muted-foreground">
            {applications.length} applicant{applications.length !== 1 ? 's' : ''} for your gig
          </p>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No applications yet</h3>
            <p className="text-muted-foreground">
              Share your gig to get more applicants
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-2xl p-6"
                data-testid={`application-${app.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Applicant Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="w-14 h-14">
                      <AvatarFallback className="bg-primary/20 text-primary text-lg">
                        {app.profiles?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{app.profiles?.name}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`border-0 ${
                            app.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                            app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {app.status === 'accepted' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                           app.status === 'rejected' ? <XCircle className="w-3 h-3 mr-1" /> :
                           <Clock className="w-3 h-3 mr-1" />}
                          {app.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>{app.profiles?.rating || 'New'} rating</span>
                      </div>
                      
                      {app.profiles?.bio && (
                        <p className="text-muted-foreground text-sm mb-3">
                          {app.profiles.bio}
                        </p>
                      )}
                      
                      {/* Skills */}
                      {app.profiles?.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {app.profiles.skills.slice(0, 5).map((skill, i) => (
                            <Badge key={i} variant="outline" className="border-white/20 text-white text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Cover Letter */}
                      {app.cover_letter && (
                        <div className="p-4 bg-white/5 rounded-xl">
                          <p className="text-sm text-muted-foreground mb-1">Cover Letter:</p>
                          <p className="text-white text-sm">{app.cover_letter}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row md:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/messages/${app.applicant_id}`)}
                      className="border-white/10 flex-1 md:flex-none"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Chat
                    </Button>
                    {app.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleAccept(app.id)}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground flex-1 md:flex-none"
                        data-testid={`accept-${app.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
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
