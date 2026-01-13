import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, Search, Users, Briefcase, Star,
  Zap, Shield, Clock, TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AIChat } from '../components/AIChat';
import { miscAPI, gigsAPI } from '../lib/api';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Matching',
    description: 'Our AI assistant helps you find the perfect gig or freelancer in seconds.'
  },
  {
    icon: Shield,
    title: 'Verified Profiles',
    description: 'All users are verified. Ratings and reviews you can trust.'
  },
  {
    icon: Clock,
    title: 'Quick Turnaround',
    description: 'Find talent or opportunities fast. Most gigs are filled within 24 hours.'
  },
  {
    icon: TrendingUp,
    title: 'Grow Your Career',
    description: 'Build your portfolio, earn ratings, and level up your freelance game.'
  }
];

const categories = [
  'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
  'Content Writing', 'Video Editing', 'Social Media', 'Data Entry'
];

export const Home = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ open_gigs: 0, freelancers: 0 });
  const [recentGigs, setRecentGigs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, gigsRes] = await Promise.all([
        miscAPI.getStats(),
        gigsAPI.list({ limit: 6 })
      ]);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (gigsRes.data.success) setRecentGigs(gigsRes.data.gigs);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/gigs?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light mb-6">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">AI-Powered Gig Marketplace</span>
              </div>
              
              <h1 className="font-unbounded font-bold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6">
                Your next gig,
                <br />
                <span className="text-primary">powered by AI</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Connect with opportunities that match your skills. Post gigs, find talent, 
                and let our AI assistant guide you every step of the way.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex gap-3 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="What skill are you looking for?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-muted-foreground"
                    data-testid="hero-search-input"
                  />
                </div>
                <Button 
                  type="submit"
                  className="h-14 px-8 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
                  data-testid="hero-search-btn"
                >
                  Search
                </Button>
              </form>

              {/* Stats */}
              <div className="flex gap-8">
                <div>
                  <p className="font-unbounded font-bold text-3xl text-white">{stats.open_gigs}+</p>
                  <p className="text-sm text-muted-foreground">Active Gigs</p>
                </div>
                <div>
                  <p className="font-unbounded font-bold text-3xl text-white">{stats.freelancers}+</p>
                  <p className="text-sm text-muted-foreground">Freelancers</p>
                </div>
              </div>
            </motion.div>

            {/* Right - AI Chat */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative h-[500px] lg:h-[600px]"
            >
              <AIChat isFullPage={true} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-unbounded font-semibold text-3xl md:text-4xl text-white mb-4">
              Explore Categories
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find opportunities across various fields. There's something for everyone.
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category, index) => (
              <motion.button
                key={category}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate(`/gigs?category=${encodeURIComponent(category)}`)}
                className="px-6 py-3 rounded-full glass hover:border-primary/50 transition-all text-white font-medium"
                data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-unbounded font-semibold text-3xl md:text-4xl text-white mb-4">
              Why Career Plus?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for students and young professionals who want to hustle smart.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-2xl glass group hover:border-primary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/30 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-unbounded font-medium text-lg text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Gigs Section */}
      {recentGigs.length > 0 && (
        <section className="py-20 md:py-32">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="font-unbounded font-semibold text-3xl md:text-4xl text-white mb-2">
                  Recent Opportunities
                </h2>
                <p className="text-muted-foreground">Fresh gigs posted by our community</p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/gigs')}
                className="border-white/10 hover:bg-white/5"
                data-testid="view-all-gigs-btn"
              >
                View All <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentGigs.slice(0, 6).map((gig, index) => (
                <motion.div
                  key={gig.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => navigate(`/gigs/${gig.id}`)}
                  className="p-6 rounded-2xl glass cursor-pointer group hover:border-primary/30 transition-all"
                  data-testid={`gig-card-${gig.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                      {gig.category}
                    </span>
                    {gig.is_urgent && (
                      <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Urgent
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-lg text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {gig.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {gig.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-accent font-semibold">
                      ${gig.budget_min} - ${gig.budget_max}
                    </span>
                    <span className="text-muted-foreground">{gig.location}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/10" />
            <div className="relative p-12 md:p-20 text-center">
              <h2 className="font-unbounded font-bold text-3xl md:text-5xl text-white mb-6">
                Ready to start your journey?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                Join thousands of students and young professionals finding their next opportunity on Career Plus.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate('/auth?mode=signup')}
                  className="bg-white text-primary hover:bg-white/90 rounded-full px-8 font-semibold"
                  data-testid="cta-signup-btn"
                >
                  Get Started Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/gigs')}
                  className="border-white/30 text-white hover:bg-white/10 rounded-full px-8"
                  data-testid="cta-browse-btn"
                >
                  Browse Gigs
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-unbounded font-bold text-lg text-white">Career+</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2025 Career Plus. Built for students, by students.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
