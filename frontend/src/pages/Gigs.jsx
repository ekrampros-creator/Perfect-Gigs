import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, Filter, MapPin, DollarSign, Clock, Zap, 
  ChevronDown, X, Loader2, Briefcase
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { gigsAPI, miscAPI } from '../lib/api';

export const Gigs = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [gigs, setGigs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    location: searchParams.get('location') || '',
    is_urgent: searchParams.get('urgent') === 'true'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadGigs();
  }, [filters]);

  const loadCategories = async () => {
    try {
      const response = await miscAPI.getCategories();
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadGigs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.location) params.location = filters.location;
      if (filters.is_urgent) params.is_urgent = true;
      
      const response = await gigsAPI.list(params);
      if (response.data.success) {
        let filteredGigs = response.data.gigs;
        
        // Client-side search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredGigs = filteredGigs.filter(gig => 
            gig.title.toLowerCase().includes(searchLower) ||
            gig.description.toLowerCase().includes(searchLower)
          );
        }
        
        setGigs(filteredGigs);
      }
    } catch (error) {
      console.error('Error loading gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key === 'is_urgent' ? 'urgent' : key, value.toString());
    } else {
      newParams.delete(key === 'is_urgent' ? 'urgent' : key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', location: '', is_urgent: false });
    setSearchParams({});
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== false).length;

  return (
    <div className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-unbounded font-bold text-3xl md:text-4xl text-white mb-2">
            Browse Gigs
          </h1>
          <p className="text-muted-foreground">
            Find opportunities that match your skills
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="glass rounded-2xl p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search gigs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                data-testid="search-input"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={filters.category}
              onValueChange={(value) => handleFilterChange('category', value)}
            >
              <SelectTrigger 
                className="w-full md:w-[200px] h-12 bg-white/5 border-white/10 text-white"
                data-testid="category-filter"
              >
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-white/10">
                <SelectItem value="">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="pl-12 h-12 w-full md:w-[180px] bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                data-testid="location-filter"
              />
            </div>

            {/* Urgent Toggle */}
            <Button
              variant={filters.is_urgent ? "default" : "outline"}
              onClick={() => handleFilterChange('is_urgent', !filters.is_urgent)}
              className={`h-12 ${filters.is_urgent ? 'bg-red-500 hover:bg-red-600' : 'border-white/10 hover:bg-white/5'}`}
              data-testid="urgent-filter"
            >
              <Zap className="w-4 h-4 mr-2" />
              Urgent Only
            </Button>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-12 text-muted-foreground hover:text-white"
                data-testid="clear-filters"
              >
                <X className="w-4 h-4 mr-2" />
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-unbounded font-semibold text-xl text-white mb-2">
              No gigs found
            </h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filters or check back later
            </p>
            <Button
              onClick={clearFilters}
              variant="outline"
              className="border-white/10"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig, index) => (
              <motion.div
                key={gig.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/gigs/${gig.id}`)}
                className="p-6 rounded-2xl glass cursor-pointer group hover:border-primary/30 transition-all"
                data-testid={`gig-card-${gig.id}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                    {gig.category}
                  </Badge>
                  {gig.is_urgent && (
                    <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-0">
                      <Zap className="w-3 h-3 mr-1" /> Urgent
                    </Badge>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="font-semibold text-lg text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {gig.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                  {gig.description}
                </p>

                {/* Meta */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {gig.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {new Date(gig.duration_start).toLocaleDateString()} - {new Date(gig.duration_end).toLocaleDateString()}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-accent font-semibold">
                    ${gig.budget_min} - ${gig.budget_max}
                  </span>
                  <div className="flex items-center gap-2">
                    {gig.profiles && (
                      <span className="text-xs text-muted-foreground">
                        by {gig.profiles.name}
                      </span>
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

export default Gigs;
