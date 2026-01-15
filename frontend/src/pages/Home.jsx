import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Search, Users, Shield, Clock, TrendingUp,
  MapPin, DollarSign, Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { AIChat } from '../components/AIChat';
import { miscAPI, gigsAPI } from '../lib/api';

const features = [
  {
    icon: Search,
    title: 'Smart Matching',
    description: 'Our system matches you with opportunities based on your skills and preferences.'
  },
  {
    icon: Shield,
    title: 'Verified Users',
    description: 'All users are verified with ratings and reviews you can trust.'
  },
  {
    icon: Clock,
    title: 'Quick Turnaround',
    description: 'Find talent or opportunities fast. Most gigs filled within 24 hours.'
  },
  {
    icon: TrendingUp,
    title: 'Build Your Career',
    description: 'Earn ratings, build your portfolio, and grow your freelance career.'
  }
];

const categories = [
  'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
  'Content Writing', 'Video Editing', 'Social Media', 'Marketing'
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
      <section className="relative py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <span className="text-xs font-medium text-primary">AI-Powered Gig Marketplace</span>
              </div>
              
              <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight mb-5">
                Find your next gig,
                <br />
                <span className="text-primary">powered by AI</span>
              </h1>
              
              <p className="text-base text-muted-foreground mb-8 max-w-md leading-relaxed">
                Connect with opportunities that match your skills. Post gigs, find talent, 
                and let our AI assistant guide you every step of the way.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="What skill are you looking for?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-secondary border-border text-sm"
                    data-testid="hero-search-input"
                  />
                </div>
                <Button 
                  type="submit"
                  className="h-11 px-6 bg-primary hover:bg-primary/90 text-sm font-medium"
                  data-testid="hero-search-btn"
                >
                  Search
                </Button>
              </form>

              {/* Stats */}
              <div className="flex gap-8">
                <div>
                  <p className="font-heading font-bold text-2xl text-foreground">{stats.open_gigs}+</p>
                  <p className="text-sm text-muted-foreground">Active Gigs</p>
                </div>
                <div>
                  <p className="font-heading font-bold text-2xl text-foreground">{stats.freelancers}+</p>
                  <p className="text-sm text-muted-foreground">Freelancers</p>
                </div>
              </div>
            </motion.div>

            {/* Right - AI Chat */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="relative h-[480px]"
            >
              <AIChat isFullPage={true} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="font-heading font-semibold text-xl md:text-2xl text-foreground mb-2">
              Browse by Category
            </h2>
            <p className="text-muted-foreground text-sm">
              Find opportunities across various fields
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category, index) => (
              <motion.button
                key={category}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/gigs?category=${encodeURIComponent(category)}`)}
                className="px-4 py-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors text-sm font-medium text-foreground"
                data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="font-heading font-semibold text-xl md:text-2xl text-foreground mb-2">
              Why Career Plus?
            </h2>
            <p className="text-muted-foreground text-sm">
              Built for students and young professionals
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-5 rounded-xl bg-card border border-border card-hover"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Gigs Section */}
      {recentGigs.length > 0 && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-heading font-semibold text-xl md:text-2xl text-foreground mb-1">
                  Recent Opportunities
                </h2>
                <p className="text-muted-foreground text-sm">Fresh gigs from our community</p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/gigs')}
                className="border-border text-sm h-9"
                data-testid="view-all-gigs-btn"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentGigs.slice(0, 6).map((gig, index) => (
                <motion.div
                  key={gig.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/gigs/${gig.id}`)}
                  className="p-5 rounded-xl bg-card border border-border cursor-pointer card-hover"
                  data-testid={`gig-card-${gig.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {gig.category}
                    </Badge>
                    {gig.is_urgent && (
                      <Badge variant="destructive" className="text-xs">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-foreground mb-2 line-clamp-2">
                    {gig.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {gig.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-accent font-medium">
                      ${gig.budget_min} - ${gig.budget_max}
                    </span>
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {gig.location}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-primary/5 border border-primary/20 p-8 md:p-12 text-center"
          >
            <h2 className="font-heading font-semibold text-2xl md:text-3xl text-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Join thousands of students and professionals finding their next opportunity.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/auth?mode=signup')}
                className="bg-primary hover:bg-primary/90 h-11 px-6"
                data-testid="cta-signup-btn"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/gigs')}
                className="border-border h-11 px-6"
                data-testid="cta-browse-btn"
              >
                Browse Gigs
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">PG</span>
              </div>
              <span className="font-heading font-semibold text-foreground text-sm">Perfect Gigs</span>
            </div>
            <p className="text-muted-foreground text-xs">
              © 2025 Perfect Gigs. Built for students, by students.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
