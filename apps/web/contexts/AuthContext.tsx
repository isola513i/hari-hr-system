import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to Admin
  const [user, setUser] = useState<User>({
    id: '6',
    name: 'Olivia Roe',
    role: 'HR_ADMIN',
    avatar: 'https://picsum.photos/id/338/200/200',
    jobTitle: 'CHRO'
  });

  const switchRole = (role: UserRole) => {
    if (role === 'HR_ADMIN') {
      setUser({
        id: '6',
        name: 'Olivia Roe',
        role: 'HR_ADMIN',
        avatar: 'https://picsum.photos/id/338/200/200',
        jobTitle: 'CHRO'
      });
    } else {
      setUser({
        id: '1',
        name: 'Liam Johnson',
        role: 'EMPLOYEE',
        avatar: 'https://picsum.photos/id/1005/200/200',
        jobTitle: 'Product Manager'
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, switchRole }}>
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