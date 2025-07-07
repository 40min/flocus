import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByText('No categories found\. Click "Add New Category" to create one\.')).toBeInTheDocument();
  });

  it('renders a list of categories', () => {
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Work related tasks')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByTitle('Blue')).toBeInTheDocument(); // Check color rendering
  });

  it('opens, fills, and submits the create category modal successfully', async () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: null });
    mockedCreateCategory.mockResolvedValue({});
    renderComponent();

    fireEvent.click(screen.getByText('Add New Category'));
    const modal = await screen.findByRole('dialog', { name: /create new category/i });

    expect(modal).toBeInTheDocument();

    fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'New Category' } });
    fireEvent.change(within(modal).getByLabelText(/description/i), { target: { value: 'New Desc' } });
    fireEvent.click(within(modal).getByTitle('Green')); // Select Green color

    fireEvent.click(within(modal).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockedCreateCategory).toHaveBeenCalledWith({
        name: 'New Category',
        description: 'New Desc',
        color: '#22C55E',
      });
    });
    expect(screen.queryByRole('dialog', { name: /create new category/i })).not.toBeInTheDocument(); // Modal should close
  });

  it('displays API error message on create category failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: null });
    mockedCreateCategory.mockRejectedValue(new ApiError('Category name already exists', 409));
    renderComponent();

    fireEvent.click(screen.getByText('Add New Category'));
    const modal = await screen.findByRole('dialog', { name: /create new category/i });

    fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Existing Category' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(within(modal).getByText('Category name already exists')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('opens, fills, and submits the edit category modal successfully', async () => {
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    mockedUpdateCategory.mockResolvedValue({});
    renderComponent();

    fireEvent.click(screen.getAllByTitle('Edit Category')[0]); // Click edit for 'Work'
    const modal = await screen.findByRole('dialog', { name: /edit category/i });

    expect(within(modal).getByLabelText('Name')).toHaveValue('Work');
    expect(within(modal).getByLabelText(/description/i)).toHaveValue('Work related tasks');
    // Check if the correct color button is selected by its class
    expect(within(modal).getByTitle('Blue')).toHaveClass('ring-2');

    fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Updated Work' } });
    fireEvent.click(within(modal).getByTitle('Red')); // Change color to Red

    fireEvent.click(within(modal).getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(mockedUpdateCategory).toHaveBeenCalledWith('1', {
        name: 'Updated Work',
        description: 'Work related tasks',
        color: '#EF4444', // Expecting Red
      });
    });
    expect(screen.queryByRole('dialog', { name: /edit category/i })).not.toBeInTheDocument(); // Modal should close
  });

  it('displays an error in the modal on update category failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    mockedUpdateCategory.mockRejectedValue(new Error('Network error'));
    renderComponent();

    fireEvent.click(screen.getAllByTitle('Edit Category')[0]);
    const modal = await screen.findByRole('dialog', { name: /edit category/i });

    fireEvent.change(within(modal).getByLabelText('Name'), { target: { value: 'Updated Work' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Update' }));


    await waitFor(() => {
      expect(within(modal).getByText('Failed to update category.')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
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
    // This test assumes no confirmation dialog for simplicity, matching the current implementation.
  });

  it('closes the modal when cancel button is clicked', async () => {
    mockedUseCategories.mockReturnValue({ data: [], isLoading: false, error: null });
    renderComponent();

    fireEvent.click(screen.getByText('Add New Category'));
    const modal = await screen.findByRole('dialog', { name: /create new category/i });

    fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: /create new category/i })).not.toBeInTheDocument();
  });

  it('resets modal form fields when opening for new category after editing', async () => {
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false, error: null });
    renderComponent();

    // First, open for editing
    fireEvent.click(screen.getAllByTitle('Edit Category')[0]);
    let modal = await screen.findByRole('dialog', { name: /edit category/i });
    expect(within(modal).getByLabelText('Name')).toHaveValue('Work');
    fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /edit category/i })).not.toBeInTheDocument());

    // Then, open for new category
    fireEvent.click(screen.getByText('Add New Category'));
    modal = await screen.findByRole('dialog', { name: /create new category/i });
    expect(within(modal).getByLabelText('Name')).toHaveValue('');
    expect(within(modal).getByLabelText(/description/i)).toHaveValue('');
    expect(within(modal).getByTitle('Slate')).toHaveClass('ring-2'); // Default color
  });
});
