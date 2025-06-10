import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthContext, AuthContextType } from '../context/AuthContext';
import Home from './Home';
import { User } from '../types/user';

const mockUser: User = { id: '1', username: 'testuser', email: 'test@test.com', first_name: 'Test', last_name: 'User' };

const renderWithAuth = (authContextValue: Partial<AuthContextType>) => {
  const fullContextValue: AuthContextType = {
    isAuthenticated: false,
    user: null,
    token: null,
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
    ...authContextValue,
  };

  return render(
    <AuthContext.Provider value={fullContextValue}>
      <Home />
    </AuthContext.Provider>
  );
};

describe('Home Page', () => {
  it('renders welcome message for a logged-in user', () => {
    renderWithAuth({ isAuthenticated: true, user: mockUser });
    expect(screen.getByText(`Welcome to the home page, ${mockUser.username}!`)).toBeInTheDocument();
  });

  it('renders generic welcome message for a guest', () => {
    renderWithAuth({ isAuthenticated: false, user: null });
    expect(screen.getByText('Welcome to the home page!')).toBeInTheDocument();
  });
});
