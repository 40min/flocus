import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditTemplatePage from './EditTemplatePage';
import { useTemplateById } from 'hooks/useTemplates';
import { useCategories } from 'hooks/useCategories';
import * as dayTemplateService from 'services/dayTemplateService';
import { DayTemplateResponse } from 'types/dayTemplate';
import { Category } from 'types/category';
import { AuthProvider } from 'context/AuthContext';
import { MessageProvider } from 'context/MessageContext';
import { NotFoundError } from 'lib/errors';

// Mocks
jest.mock('hooks/useTemplates');
jest.mock('hooks/useCategories');
jest.mock('services/dayTemplateService');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: jest.fn(),
}));

const mockedUseTemplateById = useTemplateById as jest.Mock;
const mockedUseCategories = useCategories as jest.Mock;
const mockedCreateDayTemplate = dayTemplateService.createDayTemplate as jest.Mock;
const mockedUpdateDayTemplate = dayTemplateService.updateDayTemplate as jest.Mock;
const useParams = jest.requireMock('react-router-dom').useParams;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Work', description: 'Work category', color: '#3B82F6', user_id: 'user1', is_deleted: false },
  { id: 'cat2', name: 'Personal', description: 'Personal category', color: '#10B981', user_id: 'user1', is_deleted: false },
];

const mockTemplate: DayTemplateResponse = {
  id: 'template1',
  name: 'Test Template',
  description: 'A template for testing',
  user_id: 'user1',
  time_windows: [
    { id: 'tw1', description: 'Morning work', start_time: 540, end_time: 660, category: mockCategories[0], day_template_id: 'template1', user_id: 'user1', is_deleted: false },
  ],
};

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MessageProvider>
        {children}
      </MessageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

const renderComponent = (route: string, templateId?: string) => {
  useParams.mockReturnValue({ templateId });
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/templates/new" element={<EditTemplatePage />} />
        <Route path="/templates/edit/:templateId" element={<EditTemplatePage />} />
        <Route path="/templates" element={<div>Templates List</div>} /> {/* For navigation */}
      </Routes>
    </MemoryRouter>,
    { wrapper: AllTheProviders }
  );
};

describe('EditTemplatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockedUseCategories.mockReturnValue({ data: mockCategories, isLoading: false });
    window.confirm = jest.fn(() => true); // Mock window.confirm for navigation
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      mockedUseTemplateById.mockReturnValue({ data: undefined, isLoading: false, error: null });
    });

    it('renders create form', () => {
      renderComponent('/templates/new');
      expect(screen.getByText('Create New Template')).toBeInTheDocument();
      expect(screen.getByLabelText('Template Name')).toHaveValue('');
      expect(screen.getByText('This template has no time windows yet. Add some below.')).toBeInTheDocument();
    });

    it('allows creating a new template with no time windows', async () => {
      mockedCreateDayTemplate.mockResolvedValue({ ...mockTemplate, id: 'newTemplateId', name: 'New Template', time_windows: [] });
      renderComponent('/templates/new');

      fireEvent.change(screen.getByLabelText('Template Name'), { target: { value: 'New Template' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(mockedCreateDayTemplate).toHaveBeenCalledWith({
          name: 'New Template',
          description: '',
          time_windows: [],
        });
      });
      expect(mockNavigate).toHaveBeenCalledWith('/templates/edit/newTemplateId');
    });

    it('allows adding and creating a new template with time windows', async () => {
      mockedCreateDayTemplate.mockResolvedValue({
        ...mockTemplate,
        id: 'newTemplateId',
        name: 'New Template With TW',
        time_windows: [{ id: 'server-tw1', description: 'New TW', start_time: 480, end_time: 540, category: mockCategories[0], day_template_id: 'newTemplateId', user_id: 'user1', is_deleted: false }],
      });
      renderComponent('/templates/new');

      fireEvent.click(screen.getByRole('button', { name: 'Add new time window' }));

      // Fill and submit time window modal
      const modal = await screen.findByRole('dialog', { name: /create new time window/i });
      fireEvent.change(screen.getByLabelText('Description (Optional)', { selector: '#twDescription' }), { target: { value: 'New TW' } });
      fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '08:00' } });
      fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '09:00' } });
      fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add Time Window' }));

      await waitFor(() => expect(screen.queryByRole('dialog', { name: /create new time window/i })).not.toBeInTheDocument());
      expect(screen.getByText('New TW')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('(08:00 - 09:00)')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(mockedCreateDayTemplate).toHaveBeenCalledWith({
          name: 'New Template With TW',
          description: '',
          time_windows: [{ description: 'New TW', start_time: 480, end_time: 540, category_id: 'cat1' }],
        });
      });
      expect(mockNavigate).toHaveBeenCalledWith('/templates/edit/newTemplateId');
    });

    it('shows validation errors for template name', async () => {
      renderComponent('/templates/new');
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
      await waitFor(() => {
        expect(screen.getByText('Template name is required')).toBeInTheDocument();
      });
      expect(mockedCreateDayTemplate).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      mockedUseTemplateById.mockReturnValue({ data: mockTemplate, isLoading: false, error: null });
    });

    it('renders edit form with pre-filled data and time windows', () => {
      renderComponent('/templates/edit/template1', 'template1');
      expect(screen.getByRole('heading', { name: /Edit Template/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByLabelText('Template Name')).toHaveValue(mockTemplate.name);
      expect(screen.getByText(mockTemplate.time_windows[0].category.name)).toBeInTheDocument();
      expect(screen.getByText('(09:00 - 11:00)')).toBeInTheDocument();
    });

    it('allows updating template details', async () => {
      mockedUpdateDayTemplate.mockResolvedValue({ ...mockTemplate, name: 'Updated Template Name' });
      renderComponent('/templates/edit/template1', 'template1');

      fireEvent.change(screen.getByLabelText('Template Name'), { target: { value: 'Updated Template Name' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(mockedUpdateDayTemplate).toHaveBeenCalledWith('template1', {
          name: 'Updated Template Name',
          description: 'A template for testing',
          time_windows: [{ id: 'tw1', description: 'Morning work', start_time: 540, end_time: 660, category_id: 'cat1' }],
        });
      });
      expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument(); // Button should show 'Saved'
    });

    it('allows adding a new time window to an existing template', async () => {
      mockedUpdateDayTemplate.mockResolvedValue({
        ...mockTemplate,
        time_windows: [
          ...mockTemplate.time_windows,
          { id: 'server-tw2', description: 'Evening Read', start_time: 1200, end_time: 1260, category: mockCategories[1], day_template_id: 'template1', user_id: 'user1', is_deleted: false },
        ],
      });
      renderComponent('/templates/edit/template1', 'template1');

      fireEvent.click(screen.getByRole('button', { name: 'Add new time window' }));
      const modal = await screen.findByRole('dialog', { name: /create new time window/i });

      fireEvent.change(screen.getByLabelText('Description (Optional)', { selector: '#twDescription' }), { target: { value: 'Evening Read' } });
      fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '20:00' } });
      fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '21:00' } });
      fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat2' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add Time Window' }));

      await waitFor(() => expect(screen.queryByRole('dialog', { name: /create new time window/i })).not.toBeInTheDocument());
      expect(screen.getByText('Evening Read')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('(20:00 - 21:00)')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(mockedUpdateDayTemplate).toHaveBeenCalledWith('template1', {
          name: mockTemplate.name,
          description: mockTemplate.description,
          time_windows: [
            { id: 'tw1', description: 'Morning work', start_time: 540, end_time: 660, category_id: 'cat1' },
            { description: 'Evening Read', start_time: 1200, end_time: 1260, category_id: 'cat2' },
          ],
        });
      });
    });

    it('allows editing an existing time window', async () => {
      mockedUpdateDayTemplate.mockResolvedValue({
        ...mockTemplate,
        time_windows: [
          { id: 'tw1', description: 'Updated Morning work', start_time: 540, end_time: 600, category: mockCategories[0], day_template_id: 'template1', user_id: 'user1', is_deleted: false },
        ],
      });
      renderComponent('/templates/edit/template1', 'template1');

      fireEvent.click(screen.getByTitle('Edit time window'));
      const modal = await screen.findByRole('dialog', { name: /edit time window/i });

      expect(screen.getByLabelText('Description (Optional)', { selector: '#twDescription' })).toHaveValue('Morning work');
      expect(screen.getByLabelText('Start Time')).toHaveValue('09:00');
      expect(screen.getByLabelText('End Time')).toHaveValue('11:00');
      expect(screen.getByLabelText('Category')).toHaveValue('cat1');

      fireEvent.change(screen.getByLabelText('Description (Optional)', { selector: '#twDescription' }), { target: { value: 'Updated Morning work' } });
      fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '10:00' } }); // Change end time
      fireEvent.click(screen.getByRole('button', { name: 'Update Time Window' }));

      await waitFor(() => expect(screen.queryByRole('dialog', { name: /edit time window/i })).not.toBeInTheDocument());
      expect(screen.getByText('Updated Morning work')).toBeInTheDocument();
      expect(screen.getByText('(09:00 - 10:00)')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(mockedUpdateDayTemplate).toHaveBeenCalledWith('template1', {
          name: mockTemplate.name,
          description: mockTemplate.description,
          time_windows: [
            { id: 'tw1', description: 'Updated Morning work', start_time: 540, end_time: 600, category_id: 'cat1' },
          ],
        });
      });
    });

    it('allows deleting a time window', async () => {
      mockedUpdateDayTemplate.mockResolvedValue({ ...mockTemplate, time_windows: [] });
      renderComponent('/templates/edit/template1', 'template1');

      expect(screen.getByText('Morning work')).toBeInTheDocument();
      fireEvent.click(screen.getByTitle('Delete time window'));

      await waitFor(() => {
        expect(screen.queryByText('Morning work')).not.toBeInTheDocument();
      });
      expect(screen.getByText('This template has no time windows yet. Add some below.')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(mockedUpdateDayTemplate).toHaveBeenCalledWith('template1', {
          name: mockTemplate.name,
          description: mockTemplate.description,
          time_windows: [],
        });
      });
    });

    it('prompts user before leaving with unsaved changes', async () => {
      renderComponent('/templates/edit/template1', 'template1');

      fireEvent.change(screen.getByLabelText('Template Name'), { target: { value: 'Unsaved Change' } });
      expect(screen.getByRole('button', { name: 'Save Changes' })).toHaveClass('save-button-unsaved');

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to leave?');
      expect(mockNavigate).toHaveBeenCalledWith('/templates'); // Confirmed, so navigate
    });

    it('does not navigate if user cancels leaving with unsaved changes', async () => {
      (window.confirm as jest.Mock).mockReturnValueOnce(false); // User cancels
      renderComponent('/templates/edit/template1', 'template1');

      fireEvent.change(screen.getByLabelText('Template Name'), { target: { value: 'Unsaved Change' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to leave?');
      expect(mockNavigate).not.toHaveBeenCalled(); // Should not navigate
    });

    it('navigates back without prompt if no unsaved changes', async () => {
      renderComponent('/templates/edit/template1', 'template1');
      // No changes made, so hasUnsavedChanges should be false
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(window.confirm).not.toHaveBeenCalled(); // No prompt
      expect(mockNavigate).toHaveBeenCalledWith(-1); // Navigates back
    });

    it('handles template not found error', () => {
      mockedUseTemplateById.mockReturnValue({ data: undefined, isLoading: false, error: new NotFoundError('Template not found') });
      renderComponent('/templates/edit/nonexistent', 'nonexistent');
      expect(screen.getByText('Template not found')).toBeInTheDocument();
    });

    it('handles generic error when fetching template', () => {
      mockedUseTemplateById.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Network issue') });
      renderComponent('/templates/edit/nonexistent', 'nonexistent');
      expect(screen.getByText('Network issue')).toBeInTheDocument();
    });

    it('shows saving state during template update', async () => {
      mockedUpdateDayTemplate.mockReturnValue(new Promise(() => {})); // Keep pending
      renderComponent('/templates/edit/template1', 'template1');

      fireEvent.change(screen.getByLabelText('Template Name'), { target: { value: 'Updating...' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument();
      });
    });
  });
});
