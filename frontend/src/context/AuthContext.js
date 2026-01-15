import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import { signInWithGoogle, signOutFromGoogle } from '../lib/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_data');
    
    if (token && storedUser) {
      try {
        // Try to verify with backend
        const response = await authAPI.getMe();
        if (response.data.success) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // If backend verification fails but we have stored user (Google Auth)
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_data');
        }
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    if (response.data.success) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      setUser(response.data.user);
      setIsAuthenticated(true);
      return response.data;
    }
    throw new Error('Login failed');
  };

  const signup = async (email, password, name) => {
    const response = await authAPI.signup({ email, password, name });
    if (response.data.success) {
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
      return response.data;
    }
    throw new Error('Signup failed');
  };

  const loginWithGoogle = async () => {
    try {
      const { user: googleUser, idToken } = await signInWithGoogle();
      
      // Send to backend to create/update user in Supabase
      const response = await authAPI.googleAuth({
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.avatar_url,
        firebase_uid: googleUser.uid,
        id_token: idToken,
      });
      
      if (response.data.success) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setIsAuthenticated(true);
        return response.data;
      }
      throw new Error('Google auth failed');
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOutFromGoogle();
    } catch (e) {
      // Ignore firebase signout errors
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user_data', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      signup,
      loginWithGoogle,
      logout,
      updateUser,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
