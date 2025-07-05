import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDailyStats } from 'hooks/useDailyStats';
import DailyStats from './DailyStats';
import { UserDailyStats } from 'types/userDailyStats';

jest.mock('hooks/useDailyStats');
const mockedUseDailyStats = useDailyStats as jest.Mock;

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('DailyStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockedUseDailyStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<DailyStats />, { wrapper });
    expect(screen.getByText('Loading stats...')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    mockedUseDailyStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to fetch'),
    });

    render(<DailyStats />, { wrapper });
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders stats correctly on successful fetch', () => {
    const mockStats: UserDailyStats = {
      date: new Date().toISOString(),
      total_seconds_spent: 5432, // 1h 30m 32s
      pomodoros_completed: 5,
    };

    mockedUseDailyStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DailyStats />, { wrapper });

    expect(screen.getByText('1h 30m')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Time Worked')).toBeInTheDocument();
    expect(screen.getByText('Pomos Done')).toBeInTheDocument();
  });

  it('renders zero values correctly when no stats are available', () => {
    const mockStats: UserDailyStats = {
      date: new Date().toISOString(),
      total_seconds_spent: 0,
      pomodoros_completed: 0,
    };

    mockedUseDailyStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DailyStats />, { wrapper });

    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('formats time correctly (e.g., 3660 seconds to 1h 1m)', () => {
    const mockStats: UserDailyStats = {
      date: new Date().toISOString(),
      total_seconds_spent: 3660,
      pomodoros_completed: 2,
    };

    mockedUseDailyStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DailyStats />, { wrapper });

    expect(screen.getByText('1h 1m')).toBeInTheDocument();
  });
});
