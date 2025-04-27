'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  // Load auth state from localStorage on initial mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken) {
          setToken(storedToken);
          
          if (storedUser) {
            // Try to parse stored user data
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
            } catch (err) {
              console.error('Failed to parse stored user data:', err);
              // If parsing fails, fetch fresh data
              await fetchUserData(storedToken);
            }
          } else {
            // No stored user, fetch from API
            await fetchUserData(storedToken);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Attempting login with:', email);
      
      // Connect directly to the backend server
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email, // API expects 'username' as the field name for email
          password,
        }),
      });

      console.log('Login response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 200)); // Log just the beginning to avoid clutter
      
      // Try to parse the response as JSON
      try {
        const data = JSON.parse(responseText);
        console.log('Login response data:', data);
        
        if (!data.access_token) {
          throw new Error('No access token found in response');
        }
        
        const accessToken = data.access_token;
        
        setToken(accessToken);
        localStorage.setItem('token', accessToken);
        
        // Fetch user data with the token
        const userData = await fetchUserData(accessToken);
        if (userData) {
          // Store the user data in localStorage for persistence
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        // Force a reload of the page to ensure all components reflect the logged in state
        window.location.href = '/';
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        throw new Error('Invalid response format from server. Make sure your backend is running at http://localhost:8000');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(errorData.detail || 'Registration failed');
      }

      // Auto login after successful registration
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async (authToken: string): Promise<User | null> => {
    try {
      // First try to get the user ID from the JWT token
      const tokenParts = authToken.split('.');
      if (tokenParts.length === 3) {
        // Parse the payload part of the JWT
        const payload = JSON.parse(atob(tokenParts[1]));
        const userId = payload.sub;
        
        if (userId) {
          // Fetch the user data by ID - connect directly to backend
          const response = await fetch(`http://localhost:8000/user/${userId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          });
  
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            return userData;
          }
        }
      }
      
      // Fallback: try to fetch user list and find our user - connect directly to backend
      const fallbackResponse = await fetch('http://localhost:8000/user', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (fallbackResponse.ok) {
        const users = await fallbackResponse.json();
        if (Array.isArray(users) && users.length > 0) {
          const userData = users[0]; // Just use the first user as fallback
          setUser(userData);
          return userData;
        }
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 