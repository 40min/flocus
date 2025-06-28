import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from 'context/AuthContext';
import CategoriesPage from './CategoriesPage';
import { useCategories } from 'hooks/useCategories';
import * as categoryService from 'services/categoryService';
import { Category } from 'types/category';
import { ApiError } from 'lib/errors';

// Mocks
jest.mock('hooks/useCategories');
jest.mock('services/categoryService');

const mockedUseCategories = useCategories as jest.Mock;
const mockedCreateCategory = categoryService.createCategory as jest.Mock;
const mockedUpdateCategory = categoryService.updateCategory as jest.Mock;
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

  it('renders error state when fetching categories fails', () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: new Error('Failed to fetch categories') });
    renderComponent();
    expect(screen.getByText('Failed to fetch categories')).toBeInTheDocument();
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
    expect(screen.getByText('Blue')).toBeInTheDocument(); // Check color rendering
  });

  it('opens, fills, and submits the create category form successfully', async () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: null });
    mockedCreateCategory.mockResolvedValue({});
    renderComponent();

    fireEvent.click(screen.getByText('Add New Category'));
    await screen.findByText('Create New Category');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Category' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New Desc' } });
    fireEvent.click(screen.getByTitle('Green')); // Select Green color

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockedCreateCategory).toHaveBeenCalledWith({
        name: 'New Category',
        description: 'New Desc',
        color: '#22C55E',
      });
    });
    expect(screen.queryByText('Create New Category')).not.toBeInTheDocument(); // Form should close
  });

  it('displays API error message on create category failure', async () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: null });
    mockedCreateCategory.mockRejectedValue(new ApiError('Category name already exists', 409));
    renderComponent();

    fireEvent.click(screen.getByText('Add New Category'));
    await screen.findByText('Create New Category');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Existing Category' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByText('Category name already exists')).toBeInTheDocument();
    });
  });

  it('displays generic error message on create category non-API failure', async () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: null });
    mockedCreateCategory.mockRejectedValue(new Error('Network error'));
    renderComponent();

    fireEvent.click(screen.getByText('Add New Category'));
    await screen.findByText('Create New Category');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Some Category' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to create category.')).toBeInTheDocument();
    });
  });

  it('opens, fills, and submits the edit category form successfully', async () => {
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    mockedUpdateCategory.mockResolvedValue({});
    renderComponent();

    fireEvent.click(screen.getAllByTitle('Edit Category')[0]); // Click edit for 'Work'
    await screen.findByText('Edit Category');

    expect(screen.getByLabelText('Name')).toHaveValue('Work');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Work related tasks');
    // Check if the correct color button is selected by its class
    expect(screen.getByTitle('Blue')).toHaveClass('ring-2');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Work' } });
    fireEvent.click(screen.getByTitle('Red')); // Change color to Red

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(mockedUpdateCategory).toHaveBeenCalledWith('1', {
        name: 'Updated Work',
        description: 'Work related tasks',
        color: '#EF4444', // Expecting Red
      });
    });
    expect(screen.queryByText('Edit Category')).not.toBeInTheDocument(); // Form should close
  });

  it('displays API error message on update category failure', async () => {
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    mockedUpdateCategory.mockRejectedValue(new ApiError('Category name already exists', 409));
    renderComponent();

    fireEvent.click(screen.getAllByTitle('Edit Category')[0]);
    await screen.findByText('Edit Category');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Personal' } }); // Try to change to existing name
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(screen.getByText('Category name already exists')).toBeInTheDocument();
    });
  });

  it('displays generic error message on update category non-API failure', async () => {
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    mockedUpdateCategory.mockRejectedValue(new Error('Network error'));
    renderComponent();

    fireEvent.click(screen.getAllByTitle('Edit Category')[0]);
    await screen.findByText('Edit Category');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Work' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to update category.')).toBeInTheDocument();
    });
  });

  it('deletes a category after confirmation', async () => {
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    mockedDeleteCategory.mockResolvedValue({});
    renderComponent();

    const deleteButtons = screen.getAllByTitle('Delete Category');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockedDeleteCategory).toHaveBeenCalledWith('1');
    });
  });

  it('closes the form when cancel button is clicked', async () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: null });
    renderComponent();

    fireEvent.click(screen.getByText('Add New Category'));
    await screen.findByText('Create New Category');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Temp Category' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Create New Category')).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument(); // Form fields should be gone
  });

  it('resets form fields when opening for new category after editing', async () => {
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    renderComponent();

    // First, open for editing
    fireEvent.click(screen.getAllByTitle('Edit Category')[0]);
    await screen.findByText('Edit Category');
    expect(screen.getByLabelText('Name')).toHaveValue('Work');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Edit Category')).not.toBeInTheDocument());

    // Then, open for new category
    fireEvent.click(screen.getByText('Add New Category'));
    await screen.findByText('Create New Category');
    expect(screen.getByLabelText('Name')).toHaveValue(''); // Should be reset
    expect(screen.getByLabelText(/description/i)).toHaveValue(''); // Should be reset
    expect(screen.getByTitle('Red')).toHaveClass('ring-2'); // Default color should be selected
  });
});
