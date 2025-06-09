import React, { useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm, Controller } from 'react-hook-form';
import { Task, TaskCreateRequest, TaskUpdateRequest } from 'types/task';
import { Category } from 'types/category';
import * as taskService from 'services/taskService';
import Modal from './Modal';
import { utcToLocal, localToUtc } from 'lib/utils';

interface CreateTaskFormInputs {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: Date | null;
  category_id: string | undefined;
}

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
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CreateTaskFormInputs>({
    defaultValues: {
      title: initialFormData.title,
      description: initialFormData.description || '',
      status: initialFormData.status,
      priority: initialFormData.priority,
      due_date: null,
      category_id: initialFormData.category_id || '',
    }
  });

  useEffect(() => {
    if (editingTask) {
      reset({
        title: editingTask.title,
        description: editingTask.description || '',
        status: editingTask.status,
        priority: editingTask.priority,
        due_date: editingTask.due_date ? utcToLocal(editingTask.due_date) : null,
        category_id: editingTask.category_id || '',
      });
    } else {
      reset({
        title: initialFormData.title,
        description: initialFormData.description || '',
        status: initialFormData.status,
        priority: initialFormData.priority,
        due_date: null,
        category_id: initialFormData.category_id || '',
      });
    }
  }, [editingTask, initialFormData, isOpen, reset]);

  const onSubmit = async (data: CreateTaskFormInputs) => {
    const payload = {
      ...data,
      due_date: data.due_date ? localToUtc(data.due_date) : undefined,
      category_id: data.category_id === '' ? undefined : data.category_id,
    };

    try {
      if (editingTask) {
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
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">Title</label>
          <input type="text" id="title" {...register('title', { required: 'Title is required' })} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
          <textarea id="description" {...register('description')} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
            <select id="status" {...register('status', { required: 'Status is required' })} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
            <select id="priority" {...register('priority', { required: 'Priority is required' })} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
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
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {isSubmitting ? (editingTask ? 'Updating...' : 'Creating...') : (editingTask ? 'Update Task' : 'Create Task')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
