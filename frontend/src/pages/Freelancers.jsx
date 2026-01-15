import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Loader2, Users, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
  'Content Writing', 'Video Editing', 'Social Media', 'Data Entry',
  'Virtual Assistant', 'Translation', 'Tutoring', 'Photography',
  'Music & Audio', 'Marketing', 'Delivery', 'Other'
];

export const Freelancers = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    location: ''
  });

  useEffect(() => {
    loadFreelancers();
  }, [filters]);

  const loadFreelancers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category && filters.category !== 'all') params.category = filters.category;
      if (filters.location) params.location = filters.location;
      
      const response = await api.get('/freelancers', { params });
      if (response.data.success) {
        let filtered = response.data.freelancers;
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter(f => 
            f.name?.toLowerCase().includes(searchLower) ||
            f.bio?.toLowerCase().includes(searchLower) ||
            f.skills?.some(s => s.toLowerCase().includes(searchLower))
          );
        }
        
        setFreelancers(filtered);
      }
    } catch (error) {
      console.error('Error loading freelancers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? '' : value }));
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading font-semibold text-2xl text-foreground mb-1">
            Browse Freelancers
          </h1>
          <p className="text-muted-foreground text-sm">
            Find talented professionals for your projects
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, skills..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 h-10 bg-secondary border-border text-sm"
                data-testid="search-input"
              />
            </div>

            <Select
              value={filters.category || 'all'}
              onValueChange={(value) => handleFilterChange('category', value)}
            >
              <SelectTrigger className="w-full md:w-[180px] h-10 bg-secondary border-border text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="pl-10 h-10 w-full md:w-[150px] bg-secondary border-border text-sm"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : freelancers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No freelancers found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {freelancers.map((freelancer, index) => (
              <motion.div
                key={freelancer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card rounded-xl border border-border p-5 card-hover"
                data-testid={`freelancer-card-${freelancer.id}`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {freelancer.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{freelancer.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span>{freelancer.rating || 'New'}</span>
                      <span>•</span>
                      <span>{freelancer.total_reviews || 0} reviews</span>
                    </div>
                  </div>
                </div>

                {freelancer.bio && (
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {freelancer.bio}
                  </p>
                )}

                {freelancer.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    {freelancer.location}
                  </div>
                )}

                {/* Skills */}
                {freelancer.freelancer_categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {freelancer.freelancer_categories.slice(0, 3).map((cat, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                    {freelancer.freelancer_categories.length > 3 && (
                      <Badge variant="outline" className="text-xs border-border">
                        +{freelancer.freelancer_categories.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Contact Info (if public) */}
                <div className="text-xs text-muted-foreground space-y-1 mb-4">
                  {freelancer.show_email && freelancer.email && (
                    <p>{freelancer.email}</p>
                  )}
                  {freelancer.show_phone && freelancer.phone && (
                    <p>{freelancer.phone}</p>
                  )}
                </div>

                {/* Hourly Rate */}
                {freelancer.hourly_rate && (
                  <p className="text-accent font-medium text-sm mb-4">
                    ${freelancer.hourly_rate}/hr
                  </p>
                )}

                {/* Action */}
                {isAuthenticated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/messages/${freelancer.id}`)}
                    className="w-full h-8 text-xs"
                    data-testid={`contact-${freelancer.id}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Contact
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Freelancers;
