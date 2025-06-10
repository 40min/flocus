import React from 'react';
import { render, screen } from '@testing-library/react';
import Input from './Input';

describe('Input component', () => {
  it('renders a default text input', () => {
    render(<Input type="text" data-testid="input" />);
    const inputElement = screen.getByTestId('input');
    expect(inputElement.tagName).toBe('INPUT');
    expect(inputElement).toHaveAttribute('type', 'text');
  });

  it('renders a textarea when as="textarea" is passed', () => {
    render(<Input as="textarea" data-testid="input" />);
    const textareaElement = screen.getByTestId('input');
    expect(textareaElement.tagName).toBe('TEXTAREA');
  });

  it('renders a select when as="select" is passed', () => {
    render(
      <Input as="select" data-testid="input">
        <option value="1">One</option>
      </Input>
    );
    const selectElement = screen.getByTestId('input');
    expect(selectElement.tagName).toBe('SELECT');
    expect(screen.getByText('One')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" data-testid="input" />);
    const inputElement = screen.getByTestId('input');
    expect(inputElement).toHaveClass('custom-class');
  });

  it('forwards other props to the underlying element', () => {
    render(<Input placeholder="Enter text" data-testid="input" />);
    const inputElement = screen.getByTestId('input');
    expect(inputElement).toHaveAttribute('placeholder', 'Enter text');
  });

  it('forwards a ref to the input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
