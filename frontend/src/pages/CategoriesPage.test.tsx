import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from 'context/AuthContext';
import CategoriesPage from './CategoriesPage';
import { useCategories } from 'hooks/useCategories';
import * as categoryService from 'services/categoryService';
import { Category } from 'types/category';

// Mocks
jest.mock('hooks/useCategories');
jest.mock('services/categoryService');

const mockedUseCategories = useCategories as jest.Mock;
const mockedCreateCategory = categoryService.createCategory as jest.Mock;
const mockedDeleteCategory = categoryService.deleteCategory as jest.Mock;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockCategories: Category[] = [
  { id: '1', name: 'Work', description: 'Work related tasks', color: '#3B82F6', user_id: 'user1', is_deleted: false },
  { id: '2', name: 'Personal', color: '#10B981', user_id: 'user1', is_deleted: false },
];

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Router>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  </Router>
);

const renderComponent = () => {
  return render(<CategoriesPage />, { wrapper: AllTheProviders });
};

describe('CategoriesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders loading state initially', () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: true, error: null });
    renderComponent();
    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: new Error('Failed to fetch') });
    renderComponent();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('renders no categories message when list is empty', () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: null });
    renderComponent();
    expect(screen.getByText('No categories found. Add a category to organize your tasks!')).toBeInTheDocument();
  });

  it('renders a list of categories', () => {
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Work related tasks')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('opens, fills, and submits the create category form', async () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: null });
    mockedCreateCategory.mockResolvedValue({});
    renderComponent();

    fireEvent.click(screen.getByText('Add New Category'));
    await screen.findByText('Create New Category');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Category' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New Desc' } });

    const colorButton = screen.getByTitle('Green'); // Restore color selection
    fireEvent.click(colorButton); // Restore color selection

    fireEvent.click(screen.getByRole('button', { name: /Create|Update/i }));

    await waitFor(() => {
      expect(mockedCreateCategory).toHaveBeenCalledWith({
        name: 'New Category',
        description: 'New Desc',
        color: '#22C55E', // Expecting Green
      });
    });
  });

  it('deletes a category after confirmation', async () => {
    window.confirm = jest.fn(() => true);
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    mockedDeleteCategory.mockResolvedValue({});
    renderComponent();

    const deleteButtons = screen.getAllByTitle('Delete Category');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this category?');
    await waitFor(() => {
      expect(mockedDeleteCategory).toHaveBeenCalledWith('1');
    });
  });
});
