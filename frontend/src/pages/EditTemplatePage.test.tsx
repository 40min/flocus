import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  { id: 'cat1', name: 'Work', user_id: 'user1', is_deleted: false },
  { id: 'cat2', name: 'Personal', user_id: 'user1', is_deleted: false },
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
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      mockedUseTemplateById.mockReturnValue({ data: undefined, isLoading: false });
    });

    it('renders create form', () => {
      renderComponent('/templates/new');
      expect(screen.getByText('Create New Template')).toBeInTheDocument();
      expect(screen.getByLabelText('Template Name')).toHaveValue('');
    });

    it('allows creating a new template', async () => {
      mockedCreateDayTemplate.mockResolvedValue({ ...mockTemplate, name: 'New Template' });
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
      expect(mockNavigate).toHaveBeenCalledWith('/templates');
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      mockedUseTemplateById.mockReturnValue({ data: mockTemplate, isLoading: false });
    });

    it('renders edit form with pre-filled data', () => {
      renderComponent('/templates/edit/template1', 'template1');
      expect(screen.getByRole('heading', { name: /Edit Template/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByLabelText('Template Name')).toHaveValue(mockTemplate.name);
      expect(screen.getByText(mockTemplate.time_windows[0].category.name)).toBeInTheDocument();
    });
  });
});
