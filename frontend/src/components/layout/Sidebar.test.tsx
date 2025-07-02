import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Sidebar from './Sidebar';

const mockToggleMenu = jest.fn();
const mockHandleLogout = jest.fn();

const renderSidebar = (isMenuOpen: boolean) => {
  return render(
    <Router>
      <Sidebar
        isMenuOpen={isMenuOpen}
        toggleMenu={mockToggleMenu}
        handleLogout={mockHandleLogout}
      />
    </Router>
  );
};

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders expanded sidebar correctly', () => {
    renderSidebar(true);
    expect(screen.getByText('Flocus')).toBeVisible();
    expect(screen.getByText('Dashboard')).toBeVisible();
    expect(screen.getByText('My Day')).toBeVisible();
    expect(screen.getByText('Tasks')).toBeVisible();
    expect(screen.getByText('Templates')).toBeVisible();
    expect(screen.getByText('Categories')).toBeVisible();
    expect(screen.getByText('Settings')).toBeVisible();
    expect(screen.getByText('Logout')).toBeVisible();
    expect(screen.getByRole('button', { name: /Toggle menu/i })).toBeInTheDocument();
  });

  it('renders collapsed sidebar correctly', () => {
    renderSidebar(false);
    // Check that the main title has opacity-0
    expect(screen.getByText('Flocus')).toHaveClass('opacity-0');

    // Check that navigation item texts have the opacity-0 class
    expect(screen.getByText('Dashboard')).toHaveClass('opacity-0');
    expect(screen.getByText('My Day')).toHaveClass('opacity-0');
    expect(screen.getByText('Tasks')).toHaveClass('opacity-0');
    expect(screen.getByText('Templates')).toHaveClass('opacity-0');
    expect(screen.getByText('Categories')).toHaveClass('opacity-0');
    expect(screen.getByText('Settings')).toHaveClass('opacity-0');

    // Check that logout text has the opacity-0 class
    expect(screen.getByText('Logout')).toHaveClass('opacity-0');
  });

  it('calls toggleMenu when the toggle button is clicked', () => {
    renderSidebar(true);
    const toggleButton = screen.getByRole('button', { name: /Toggle menu/i });
    fireEvent.click(toggleButton);
    expect(mockToggleMenu).toHaveBeenCalledTimes(1);
  });

  it('calls handleLogout when the logout button is clicked', () => {
    renderSidebar(true);
    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    fireEvent.click(logoutButton);
    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });
});
