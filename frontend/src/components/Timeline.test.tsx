import React from 'react';
import { render, screen } from '@testing-library/react';
import Timeline from '../components/Timeline';

describe('Timeline', () => {
  const mockTimeWindows = [
    {
      id: '1',
      start_time: '2025-01-01T09:00:00Z', // Should display 9:00 AM in UTC
      end_time: '2025-01-01T10:00:00Z',
      category: {
        id: 'cat1',
        name: 'Work',
        color: '#FF0000',
      },
    },
    {
      id: '2',
      start_time: '2025-01-01T11:30:00Z', // Should display 11:30 AM in UTC
      end_time: '2025-01-01T12:30:00Z',
      category: {
        id: 'cat2',
        name: 'Break',
        color: '#00FF00',
      },
    },
  ];

  it('renders without crashing', () => {
    render(<Timeline timeWindows={[]} />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('renders the correct number of time window markers', () => {
    render(<Timeline timeWindows={mockTimeWindows} />);
    const timeMarkers = screen.getAllByText(/AM|PM/);
    expect(timeMarkers.length).toBe(mockTimeWindows.length);
  });

  it('displays the correct start times', () => {
    render(<Timeline timeWindows={mockTimeWindows} />);
    expect(screen.getByText('11:00 AM')).toBeInTheDocument();
    expect(screen.getByText('1:30 PM')).toBeInTheDocument();
  });

  it('applies the correct background color to category dots', () => {
    render(<Timeline timeWindows={mockTimeWindows} />);
    const workDot = screen.getByTitle('Work');
    const breakDot = screen.getByTitle('Break');

    expect(workDot).toHaveStyle('background-color: #FF0000');
    expect(breakDot).toHaveStyle('background-color: #00FF00');
  });

  it('adds a tooltip with the category name to the dots', () => {
    render(<Timeline timeWindows={mockTimeWindows} />);
    expect(screen.getByTitle('Work')).toBeInTheDocument();
    expect(screen.getByTitle('Break')).toBeInTheDocument();
  });
});
