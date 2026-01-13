import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Briefcase, FileText, Users, Star, 
  ArrowRight, Loader2, Zap, Plus, TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { gigsAPI, matchAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [myGigs, setMyGigs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [recommendedGigs, setRecommendedGigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { returnTo: '/dashboard' } });
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      const [gigsRes, appsRes, matchRes] = await Promise.all([
        gigsAPI.getMyGigs(),
        gigsAPI.getMyApplications(),
        user?.is_freelancer ? matchAPI.getGigs() : Promise.resolve({ data: { gigs: [] } })
      ]);

      if (gigsRes.data.success) setMyGigs(gigsRes.data.gigs);
      if (appsRes.data.success) setMyApplications(appsRes.data.applications);
      if (matchRes.data?.success) setRecommendedGigs(matchRes.data.gigs);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: 'Active Gigs', value: myGigs.filter(g => g.status === 'open').length, icon: Briefcase },
    { label: 'Applications', value: myApplications.length, icon: FileText },
    { label: 'Rating', value: user?.rating || 'New', icon: Star },
  ];

  return (
    <div className="min-h-screen py-8 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading font-semibold text-2xl text-foreground mb-1">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Welcome back, {user?.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/post-gig')}
              className="h-9 text-sm bg-primary hover:bg-primary/90"
              data-testid="post-gig-btn"
            >
              <Plus className="w-4 h-4 mr-1" />
              Post Gig
            </Button>
            {!user?.is_freelancer && (
              <Button
                variant="outline"
                onClick={() => navigate('/freelancer/register')}
                className="h-9 text-sm"
                data-testid="become-freelancer-btn"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Become Freelancer
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl border border-border p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                  <p className="font-heading font-semibold text-xl text-foreground">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-gigs" className="space-y-4">
          <TabsList className="bg-secondary h-9">
            <TabsTrigger value="my-gigs" className="text-xs h-7 data-[state=active]:bg-primary">
              My Gigs ({myGigs.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="text-xs h-7 data-[state=active]:bg-primary">
              Applications ({myApplications.length})
            </TabsTrigger>
            {user?.is_freelancer && (
              <TabsTrigger value="recommended" className="text-xs h-7 data-[state=active]:bg-primary">
                Recommended ({recommendedGigs.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-gigs" className="space-y-3">
            {myGigs.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-foreground font-medium mb-1">No gigs yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Post your first gig</p>
                <Button onClick={() => navigate('/post-gig')} className="h-9 text-sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Post a Gig
                </Button>
              </div>
            ) : (
              myGigs.map((gig, index) => (
                <motion.div
                  key={gig.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-card rounded-xl border border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  data-testid={`my-gig-${gig.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {gig.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {gig.status}
                      </Badge>
                      {gig.is_urgent && (
                        <Badge variant="destructive" className="text-xs">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-foreground font-medium text-sm mb-0.5">{gig.title}</h3>
                    <p className="text-muted-foreground text-xs">
                      ${gig.budget_min} - ${gig.budget_max} • {gig.applications_count || 0} applications
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/gigs/${gig.id}/applications`)}
                      className="h-8 text-xs"
                    >
                      <Users className="w-3.5 h-3.5 mr-1" />
                      Applications
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/gigs/${gig.id}`)}
                      className="h-8 text-xs bg-primary"
                    >
                      View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="applications" className="space-y-3">
            {myApplications.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-foreground font-medium mb-1">No applications yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Browse gigs and start applying</p>
                <Button onClick={() => navigate('/gigs')} className="h-9 text-sm">
                  Browse Gigs
                </Button>
              </div>
            ) : (
              myApplications.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-card rounded-xl border border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  data-testid={`application-${app.id}`}
                >
                  <div className="flex-1">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs mb-1.5 ${
                        app.status === 'accepted' ? 'bg-accent/20 text-accent' :
                        app.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                        'bg-yellow-500/20 text-yellow-500'
                      }`}
                    >
                      {app.status}
                    </Badge>
                    <h3 className="text-foreground font-medium text-sm mb-0.5">{app.gigs?.title}</h3>
                    <p className="text-muted-foreground text-xs">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/gigs/${app.gig_id}`)}
                    className="h-8 text-xs"
                  >
                    View Gig <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </motion.div>
              ))
            )}
          </TabsContent>

          {user?.is_freelancer && (
            <TabsContent value="recommended" className="space-y-3">
              {recommendedGigs.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-foreground font-medium mb-1">No recommendations yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Update your profile with skills to get matched
                  </p>
                </div>
              ) : (
                recommendedGigs.map((gig, index) => (
                  <motion.div
                    key={gig.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => navigate(`/gigs/${gig.id}`)}
                    className="bg-card rounded-xl border border-border p-4 cursor-pointer card-hover"
                    data-testid={`recommended-gig-${gig.id}`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {gig.category}
                      </Badge>
                      {gig.is_urgent && (
                        <Badge variant="destructive" className="text-xs">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-foreground font-medium text-sm mb-0.5">{gig.title}</h3>
                    <p className="text-muted-foreground text-xs line-clamp-2 mb-2">{gig.description}</p>
                    <p className="text-accent font-medium text-sm">${gig.budget_min} - ${gig.budget_max}</p>
                  </motion.div>
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
