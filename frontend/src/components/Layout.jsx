import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Search, PlusCircle, MessageSquare, User, 
  Menu, X, LogOut, LayoutDashboard
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { AIChat, AIChatButton } from './AIChat';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/gigs', icon: Search, label: 'Browse Gigs' },
  { path: '/post-gig', icon: PlusCircle, label: 'Post Gig', auth: true },
  { path: '/messages', icon: MessageSquare, label: 'Messages', auth: true },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', auth: true },
];

export const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredNavItems = navItems.filter(item => !item.auth || isAuthenticated);

  return (
    <div className="min-h-screen bg-background bg-gradient-subtle">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">C+</span>
              </div>
              <span className="font-heading font-semibold text-foreground">Career Plus</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-2">
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors"
                    data-testid="profile-link"
                  >
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{user?.name}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/auth')}
                    className="text-muted-foreground hover:text-foreground h-8 px-3 text-sm"
                    data-testid="login-btn"
                  >
                    Log in
                  </Button>
                  <Button
                    onClick={() => navigate('/auth?mode=signup')}
                    className="bg-primary hover:bg-primary/90 h-8 px-4 text-sm"
                    data-testid="signup-btn"
                  >
                    Sign up
                  </Button>
                </div>
              )}

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-14 left-0 right-0 z-40 bg-background border-b border-border md:hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
              
              {!isAuthenticated && (
                <div className="pt-3 mt-3 border-t border-border space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-9 text-sm"
                    onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
                  >
                    Log in
                  </Button>
                  <Button
                    className="w-full h-9 text-sm bg-primary"
                    onClick={() => { navigate('/auth?mode=signup'); setMobileMenuOpen(false); }}
                  >
                    Sign up
                  </Button>
                </div>
              )}
              
              {isAuthenticated && (
                <div className="pt-3 mt-3 border-t border-border">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Profile</span>
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Log out</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-14 min-h-screen">
        {children}
      </main>

      {/* AI Chat */}
      <AIChatButton onClick={() => setChatOpen(true)} />
      <AIChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default Layout;
