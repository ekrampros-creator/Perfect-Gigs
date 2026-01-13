import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Briefcase, FileText, Users, Star, Clock, 
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: 'Active Gigs', value: myGigs.filter(g => g.status === 'open').length, icon: Briefcase },
    { label: 'Applications', value: myApplications.length, icon: FileText },
    { label: 'Rating', value: user?.rating || 'New', icon: Star },
  ];

  return (
    <div className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-unbounded font-bold text-3xl text-white mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name}!
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/post-gig')}
              className="bg-primary hover:bg-primary/90"
              data-testid="post-gig-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Post a Gig
            </Button>
            {!user?.is_freelancer && (
              <Button
                variant="outline"
                onClick={() => navigate('/freelancer/register')}
                className="border-white/10"
                data-testid="become-freelancer-btn"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Become Freelancer
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                  <p className="font-unbounded font-bold text-2xl text-white">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-gigs" className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger value="my-gigs" className="rounded-lg data-[state=active]:bg-primary">
              My Gigs ({myGigs.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="rounded-lg data-[state=active]:bg-primary">
              Applications ({myApplications.length})
            </TabsTrigger>
            {user?.is_freelancer && (
              <TabsTrigger value="recommended" className="rounded-lg data-[state=active]:bg-primary">
                Recommended ({recommendedGigs.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Gigs */}
          <TabsContent value="my-gigs" className="space-y-4">
            {myGigs.length === 0 ? (
              <div className="text-center py-12 glass rounded-2xl">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">No gigs yet</h3>
                <p className="text-muted-foreground mb-4">Post your first gig to find talent</p>
                <Button onClick={() => navigate('/post-gig')} className="bg-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Post a Gig
                </Button>
              </div>
            ) : (
              myGigs.map((gig, index) => (
                <motion.div
                  key={gig.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  data-testid={`my-gig-${gig.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                        {gig.category}
                      </Badge>
                      <Badge variant="outline" className="border-white/20 text-white">
                        {gig.status}
                      </Badge>
                      {gig.is_urgent && (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-0">
                          <Zap className="w-3 h-3 mr-1" /> Urgent
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-white font-semibold mb-1">{gig.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      ${gig.budget_min} - ${gig.budget_max} • {gig.applications_count || 0} applications
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/gigs/${gig.id}/applications`)}
                      className="border-white/10"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Applications
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/gigs/${gig.id}`)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      View <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Applications */}
          <TabsContent value="applications" className="space-y-4">
            {myApplications.length === 0 ? (
              <div className="text-center py-12 glass rounded-2xl">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-4">Browse gigs and start applying</p>
                <Button onClick={() => navigate('/gigs')} className="bg-primary">
                  Browse Gigs
                </Button>
              </div>
            ) : (
              myApplications.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  data-testid={`application-${app.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="secondary" 
                        className={`border-0 ${
                          app.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                          app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {app.status}
                      </Badge>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{app.gigs?.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/gigs/${app.gig_id}`)}
                    className="border-white/10"
                  >
                    View Gig <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Recommended */}
          {user?.is_freelancer && (
            <TabsContent value="recommended" className="space-y-4">
              {recommendedGigs.length === 0 ? (
                <div className="text-center py-12 glass rounded-2xl">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No recommendations yet</h3>
                  <p className="text-muted-foreground">
                    Update your profile with skills to get matched with gigs
                  </p>
                </div>
              ) : (
                recommendedGigs.map((gig, index) => (
                  <motion.div
                    key={gig.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/gigs/${gig.id}`)}
                    className="glass rounded-xl p-6 cursor-pointer hover:border-primary/30 transition-all"
                    data-testid={`recommended-gig-${gig.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                        {gig.category}
                      </Badge>
                      {gig.is_urgent && (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-0">
                          <Zap className="w-3 h-3 mr-1" /> Urgent
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-white font-semibold mb-1">{gig.title}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-2">{gig.description}</p>
                    <p className="text-accent font-semibold">${gig.budget_min} - ${gig.budget_max}</p>
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
