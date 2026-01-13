import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, MapPin, Zap, X, Loader2, Briefcase, Clock
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
    const actualValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: actualValue }));
    
    const newParams = new URLSearchParams(searchParams);
    if (actualValue) {
      newParams.set(key === 'is_urgent' ? 'urgent' : key, actualValue.toString());
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
    <div className="min-h-screen py-8 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading font-semibold text-2xl text-foreground mb-1">
            Browse Gigs
          </h1>
          <p className="text-muted-foreground text-sm">
            Find opportunities that match your skills
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search gigs..."
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
              <SelectTrigger 
                className="w-full md:w-[180px] h-10 bg-secondary border-border text-sm"
                data-testid="category-filter"
              >
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
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
                data-testid="location-filter"
              />
            </div>

            <Button
              variant={filters.is_urgent ? "default" : "outline"}
              onClick={() => handleFilterChange('is_urgent', !filters.is_urgent)}
              className={`h-10 text-sm ${filters.is_urgent ? 'bg-destructive hover:bg-destructive/90' : ''}`}
              data-testid="urgent-filter"
            >
              <Zap className="w-4 h-4 mr-1.5" />
              Urgent
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-10 text-sm text-muted-foreground"
                data-testid="clear-filters"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No gigs found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Try adjusting your filters
            </p>
            <Button variant="outline" onClick={clearFilters} className="text-sm">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gigs.map((gig, index) => (
              <motion.div
                key={gig.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/gigs/${gig.id}`)}
                className="p-5 rounded-xl bg-card border border-border cursor-pointer card-hover"
                data-testid={`gig-card-${gig.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="secondary" className="text-xs">
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

                <div className="space-y-1.5 mb-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {gig.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(gig.duration_start).toLocaleDateString()} - {new Date(gig.duration_end).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-accent font-medium text-sm">
                    ${gig.budget_min} - ${gig.budget_max}
                  </span>
                  {gig.profiles && (
                    <span className="text-xs text-muted-foreground">
                      by {gig.profiles.name}
                    </span>
                  )}
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
