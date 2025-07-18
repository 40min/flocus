import React, { useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Task, TaskCreateRequest, TaskUpdateRequest } from 'types/task';
import { Category } from 'types/category';
import { useSharedTimerContext } from 'context/SharedTimerContext';
import * as taskService from 'services/taskService';
import { useLlmSuggestions } from 'hooks/useLlmSuggestions';
import Button from 'components/Button';
import Modal from './Modal';
import { utcToLocal, localToUtc } from 'lib/utils';
import { Sparkles, Bot } from 'lucide-react';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.string({ required_error: 'Status is required' }),
  priority: z.string({ required_error: 'Priority is required' }),
  due_date: z.date().nullable().optional(),
  category_id: z.string().optional(),
});

type CreateTaskFormInputs = z.infer<typeof taskFormSchema>;

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  editingTask: Task | null;
  categories: Category[];
  initialFormData: TaskCreateRequest;
  statusOptions: { value: string; label: string }[];
  priorityOptions: { value: string; label: string }[];
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  editingTask,

  categories,
  initialFormData,
  statusOptions,
  priorityOptions,
}) => {
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting }, setValue, getValues, watch } = useForm<CreateTaskFormInputs>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialFormData.title,
      description: initialFormData.description || '',
      status: initialFormData.status,
      priority: initialFormData.priority,
      due_date: null,
      category_id: initialFormData.category_id || '',
    }
  });

  const { currentTaskId, stopCurrentTask, resetForNewTask } = useSharedTimerContext();

  const title = watch('title'); // Watch the title field for changes

  const {
    titleSuggestion,
    descriptionSuggestion,
    loadingTitleSuggestion,
    loadingDescriptionSuggestion,
    handleImproveTitle,
    handleImproveDescription,
    applyTitleSuggestion,
    rejectTitleSuggestion,
    applyDescriptionSuggestion,
    rejectDescriptionSuggestion,
    resetSuggestions,
  } = useLlmSuggestions(getValues, setValue);

  const {
    title: initialTitle,
    description: initialDescription,
    status: initialStatus,
    priority: initialPriority,
    category_id: initialCategoryId,
  } = initialFormData;

  const initialValues = React.useMemo(() => {
    if (editingTask) {
      return {
        title: editingTask.title,
        description: editingTask.description || '',
        status: editingTask.status,
        priority: editingTask.priority,
        due_date: editingTask.due_date ? utcToLocal(editingTask.due_date) : null,
        category_id: editingTask.category_id || '',
      };
    }
    return {
      title: initialTitle,
      description: initialDescription || '',
      status: initialStatus,
      priority: initialPriority,
      due_date: null,
      category_id: initialCategoryId || '',
    };
  }, [
    editingTask,
    initialTitle,
    initialDescription,
    initialStatus,
    initialPriority,
    initialCategoryId,
  ]);

  useEffect(() => {
    if (isOpen) {
      reset(initialValues);
      resetSuggestions();
    }
  }, [isOpen, initialValues, reset, resetSuggestions]);

  const onSubmit = async (data: CreateTaskFormInputs) => {
    const payload = {
      ...data,
      due_date: data.due_date ? localToUtc(data.due_date) : undefined,
      category_id: data.category_id === '' ? undefined : data.category_id,
    };

    try {
      if (editingTask) {
        if (
          editingTask.id === currentTaskId &&
          editingTask.status === 'in_progress' &&
          data.status !== 'in_progress'
        ) {
          await stopCurrentTask();
        } else if (
          editingTask.id === currentTaskId &&
          data.status === 'in_progress'
        ) {
          // If the current task is explicitly set to 'in_progress' via the modal, reset the timer
          await resetForNewTask();
        }
        await taskService.updateTask(editingTask.id, payload as TaskUpdateRequest);
      } else {
        await taskService.createTask(payload as TaskCreateRequest);
      }
      onSubmitSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      // Handle error display if needed, e.g., using a state or context for messages
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTask ? 'Edit Task' : 'Create New Task'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <div className="flex justify-between items-center">
            <label htmlFor="title" className="block text-sm font-medium text-slate-700">Title</label>
            <button
              type="button"
              onClick={handleImproveTitle}
              disabled={loadingTitleSuggestion}
              className="text-gray-600 hover:text-blue-800 text-sm disabled:opacity-50 flex items-center"
              title="Improve title"
            >
              {loadingTitleSuggestion ? (
                <span className="flex items-center">Improving...</span>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          </div>
          <input type="text" id="title" {...register('title')} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          {titleSuggestion && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
              <p className="font-semibold mb-1">Suggestion:</p>
              <p>{titleSuggestion}</p>
              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" onClick={applyTitleSuggestion} variant="primary" size="small">
                  Approve
                </Button>
                <Button type="button" onClick={rejectTitleSuggestion} variant="secondary" size="small">
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="flex justify-between items-center">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
            <div className="flex items-center"> {/* Group buttons */}
              <button
                type="button"
                onClick={handleImproveDescription}
                disabled={loadingDescriptionSuggestion}
                className="text-gray-600 hover:text-blue-800 text-sm disabled:opacity-50 flex items-center"
                title="Improve description"
              >
                {loadingDescriptionSuggestion ? (
                  <span className="flex items-center">Improving...</span>
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </button>
              {title && ( // Conditional rendering for the new button
                <button
                  type="button"
                  onClick={handleImproveDescription}
                  disabled={loadingDescriptionSuggestion}
                  className="text-gray-600 hover:text-blue-800 text-sm disabled:opacity-50 flex items-center ml-2"
                  title="Generate description from title"
                >
                  {loadingDescriptionSuggestion ? (
                    <span className="flex items-center">Generating...</span>
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
          <textarea id="description" {...register('description')} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
          {descriptionSuggestion && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
              <p className="font-semibold mb-1">Suggestion:</p>
              <p>{descriptionSuggestion}</p>
              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" onClick={applyDescriptionSuggestion} variant="primary" size="small">
                  Approve
                </Button>
                <Button type="button" onClick={rejectDescriptionSuggestion} variant="secondary" size="small">
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
            <select id="status" {...register('status')} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
            <select id="priority" {...register('priority')} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {priorityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>}
          </div>
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-slate-700">Due Date</label>
            <Controller
              control={control}
              name="due_date"
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onChange={(date) => field.onChange(date)}
                  dateFormat="yyyy-MM-dd HH:mm"
                  showTimeSelect
                  timeFormat="HH:mm"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  wrapperClassName="w-full"
                />
              )}
            />
          </div>
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-slate-700">Category</label>
            <select id="category_id" {...register('category_id')} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="">No Category</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" onClick={onClose} variant="secondary" size="medium">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} variant="slate" size="medium">
            {isSubmitting ? (editingTask ? 'Updating...' : 'Creating...') : (editingTask ? 'Update Task' : 'Create Task')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
