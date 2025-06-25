import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageBalloon from './MessageBalloon';
import { useMessage } from '../context/MessageContext';

jest.mock('../context/MessageContext');

const mockedUseMessage = useMessage as jest.Mock;

describe('MessageBalloon', () => {
  it('does not render when there is no message', () => {
    mockedUseMessage.mockReturnValue({ message: null, clearMessage: jest.fn() });
    const { container } = render(<MessageBalloon />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a success message correctly', () => {
    const message = { text: 'Success!', type: 'success' as const };
    mockedUseMessage.mockReturnValue({ message, clearMessage: jest.fn() });
    render(<MessageBalloon />);

    const balloon = screen.getByText('Success!').parentElement;
    expect(balloon).toBeInTheDocument();
    expect(balloon).toHaveClass('bg-green-500');
  });

  it('renders an error message correctly', () => {
    const message = { text: 'Error!', type: 'error' as const };
    mockedUseMessage.mockReturnValue({ message, clearMessage: jest.fn() });
    render(<MessageBalloon />);

    const balloon = screen.getByText('Error!').parentElement;
    expect(balloon).toBeInTheDocument();
    expect(balloon).toHaveClass('bg-red-500');
  });

  it('calls clearMessage when the close button is clicked', () => {
    const clearMessageMock = jest.fn();
    const message = { text: 'A message', type: 'success' as const };
    mockedUseMessage.mockReturnValue({ message, clearMessage: clearMessageMock });
    render(<MessageBalloon />);

    const closeButton = screen.getByRole('button', { name: /×/i });
    fireEvent.click(closeButton);

    expect(clearMessageMock).toHaveBeenCalledTimes(1);
  });
});
