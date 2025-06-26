import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);
    onCloseMock.mockClear();
  });
afterEach(() => {
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
      document.body.removeChild(modalRoot);
    }
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={onCloseMock}>
        <div>Modal Content</div>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={onCloseMock} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    render(
      <Modal isOpen={true} onClose={onCloseMock}>
        <div>Modal Content</div>
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    render(
      <Modal isOpen={true} onClose={onCloseMock}>
        <div>Modal Content</div>
      </Modal>
    );
    // The backdrop is the root div of the modal
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the modal content is clicked', () => {
    render(
      <Modal isOpen={true} onClose={onCloseMock}>
        <div data-testid="modal-content">Modal Content</div>
      </Modal>
    );
    fireEvent.click(screen.getByTestId('modal-content'));
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
