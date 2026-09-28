import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../models/types.ts';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../services/api.ts';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  loading: boolean;
  isAdmin: boolean;
  isStoreManager: boolean;
  isFieldTech: boolean;
  isSupport: boolean;
  switchUser: (userId: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const users = await api.getUsers();
      setAllUsers(users);

      const token = getStoredToken();
      if (token) {
        try {
          const me = await api.getCurrentUser();
          setCurrentUser(me);
        } catch {
          // If token expired, fall back to Admin user
          if (users.length > 0) {
            const admin = users.find(u => u.role === 'Admin') || users[0];
            await loginWithUser(admin.id);
          }
        }
      } else if (users.length > 0) {
        // Default login as Admin for instant full visibility
        const admin = users.find(u => u.role === 'Admin') || users[0];
        await loginWithUser(admin.id);
      }
    } catch (err) {
      console.error('Failed to initialize auth:', err);
    } finally {
      setLoading(false);
    }
  };

  const loginWithUser = async (userId: string) => {
    const { user, token } = await api.login(undefined, userId);
    setStoredToken(token);
    setCurrentUser(user);
  };

  const switchUser = async (userId: string) => {
    setLoading(true);
    try {
      await loginWithUser(userId);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (role: UserRole) => {
    const match = allUsers.find(u => u.role === role);
    if (match) {
      await switchUser(match.id);
    }
  };

  const logout = () => {
    clearStoredToken();
    setCurrentUser(null);
  };

  const refreshUsers = async () => {
    const users = await api.getUsers();
    setAllUsers(users);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const role = currentUser?.role;
  const isAdmin = role === 'Admin';
  const isStoreManager = role === 'Store Manager';
  const isFieldTech = role === 'Field Technician';
  const isSupport = role === 'Support';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        loading,
        isAdmin,
        isStoreManager,
        isFieldTech,
        isSupport,
        switchUser,
        switchRole,
        logout,
        refreshUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
