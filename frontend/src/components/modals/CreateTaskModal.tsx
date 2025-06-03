import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Task, TaskCreateRequest, TaskUpdateRequest } from 'types/task';
import { Category } from 'types/category';
import * as taskService from 'services/taskService';
import Modal from './Modal'; // Import the Modal component
import { utcToLocal, localToUtc } from 'lib/utils';

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
  const [formData, setFormData] = useState<TaskCreateRequest | TaskUpdateRequest>(initialFormData);
  const [formDueDate, setFormDueDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        description: editingTask.description || '',
        status: editingTask.status,
        priority: editingTask.priority,
        category_id: editingTask.category_id || undefined,
      });
      setFormDueDate(editingTask.due_date ? utcToLocal(editingTask.due_date) : null);
    } else {
      setFormData(initialFormData);
      setFormDueDate(null);
    }
  }, [editingTask, initialFormData, isOpen]); // Reset form when modal opens or editingTask changes

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date: Date | null) => {
    setFormDueDate(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payload = {
      ...formData,
      due_date: formDueDate ? localToUtc(formDueDate) : undefined,
      category_id: formData.category_id === '' ? undefined : formData.category_id,
    };

    try {
      if (editingTask) {
        await taskService.updateTask(editingTask.id, payload as TaskUpdateRequest);
      } else {
        await taskService.createTask(payload as TaskCreateRequest);
      }
      onSubmitSuccess(); // Call the success callback
      onClose(); // Close the modal
    } catch (err) {
      setError(editingTask ? 'Failed to update task.' : 'Failed to create task.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTask ? 'Edit Task' : 'Create New Task'}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">Title</label>
          <input type="text" name="title" id="title" value={formData.title} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
          <textarea name="description" id="description" value={formData.description || ''} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
            <select name="status" id="status" value={formData.status} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
            <select name="priority" id="priority" value={formData.priority} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {priorityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-slate-700">Due Date</label>
            <DatePicker selected={formDueDate} onChange={handleDateChange} dateFormat="yyyy-MM-dd" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" wrapperClassName="w-full" />
          </div>
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-slate-700">Category</label>
            <select name="category_id" id="category_id" value={formData.category_id || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="">No Category</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {isLoading ? (editingTask ? 'Updating...' : 'Creating...') : (editingTask ? 'Update Task' : 'Create Task')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
