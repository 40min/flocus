import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { useTemplates } from 'hooks/useTemplates';
import * as dayTemplateService from 'services/dayTemplateService';
import TemplatesPage from './TemplatesPage';
import { DayTemplateResponse } from 'types/dayTemplate';

// Mocks
jest.mock('hooks/useTemplates');
jest.mock('services/dayTemplateService');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockedUseTemplates = useTemplates as jest.Mock;
const mockedDeleteDayTemplate = dayTemplateService.deleteDayTemplate as jest.Mock;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockTemplates: DayTemplateResponse[] = [
  {
    id: '1',
    name: 'Morning Routine',
    description: 'My morning routine template',
    user_id: 'user1',
    time_windows: [
      { id: 'tw1', start_time: 540, end_time: 600, description: 'Work', category: { id: 'cat1', name: 'Work', user_id: 'user1', is_deleted: false }, day_template_id: '1', user_id: 'user1', is_deleted: false },
    ],
  },
  { id: '2', name: 'Evening Routine', user_id: 'user1', time_windows: [] },
];

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Router>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </Router>
);

const renderComponent = () => {
  return render(<TemplatesPage />, { wrapper: AllTheProviders });
};

describe('TemplatesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders loading state', () => {
    mockedUseTemplates.mockReturnValue({ data: [], isLoading: true, error: null });
    renderComponent();
    expect(screen.getByText('Loading templates...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockedUseTemplates.mockReturnValue({ data: [], isLoading: false, error: new Error('Failed to fetch templates') });
    renderComponent();
    expect(screen.getByText('Failed to fetch templates')).toBeInTheDocument();
  });

  it('renders a list of templates', () => {
    mockedUseTemplates.mockReturnValue({ data: mockTemplates, isLoading: false, error: null });
    renderComponent();
    expect(screen.getByText('Morning Routine')).toBeInTheDocument();
    expect(screen.getByText('My morning routine template')).toBeInTheDocument();
    expect(screen.getByText('Evening Routine')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' &&
             element?.classList.contains('font-semibold') &&
             content === 'Work';
    })).toBeInTheDocument();
    expect(screen.getByText('(09:00-10:00)')).toBeInTheDocument();
  });

  it('navigates to new template page on "Create Template" click', () => {
    mockedUseTemplates.mockReturnValue({ data: [], isLoading: false, error: null });
    renderComponent();
    fireEvent.click(screen.getByText('Create Template'));
    expect(mockNavigate).toHaveBeenCalledWith('/templates/new');
  });

  it('navigates to edit template page on "Edit" click', () => {
    mockedUseTemplates.mockReturnValue({ data: mockTemplates, isLoading: false, error: null });
    renderComponent();
    const editButtons = screen.getAllByTitle('Edit Template');
    fireEvent.click(editButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/templates/edit/1');
  });

  it('deletes a template on "Delete" click and confirmation', async () => {
    window.confirm = jest.fn(() => true);
    mockedUseTemplates.mockReturnValue({ data: mockTemplates, isLoading: false, error: null });
    mockedDeleteDayTemplate.mockResolvedValue({});
    renderComponent();

    const deleteButtons = screen.getAllByTitle('Delete Template');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this template?');
    await waitFor(() => {
      expect(mockedDeleteDayTemplate).toHaveBeenCalledWith('1');
    });
  });
});
