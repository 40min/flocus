import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { Task, TaskCreateRequest, TaskUpdateRequest } from '../types/task';
import { Category } from '../types/category';
import * as taskService from '../services/taskService';
import * as categoryService from '../services/categoryService';

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const initialFormData: TaskCreateRequest = {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: null,
    category_id: '',
  };
  const [formData, setFormData] = useState<TaskCreateRequest | TaskUpdateRequest>(initialFormData);
  const [formDueDate, setFormDueDate] = useState<Date | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await taskService.getAllTasks();
      setTasks(data);
    } catch (err) {
      setError('Failed to fetch tasks.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoryService.getAllCategories();
      setCategories(data);
      if (data.length > 0 && !editingTask) {
        setFormData((prev: TaskCreateRequest | TaskUpdateRequest) => ({ ...prev, category_id: prev.category_id || '' }));
      }
    } catch (err) {
      setError(prev => prev ? `${prev} Failed to fetch categories.` : 'Failed to fetch categories.');
      console.error(err);
    }
  }, [editingTask]);

  // useEffect for fetching tasks (runs once on mount)
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]); // fetchTasks is stable

  // useEffect for fetching categories (runs on mount and when editingTask changes, or fetchCategories itself changes)
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
      due_date: formDueDate ? formDueDate.toISOString().split('T')[0] : undefined,
    };

    try {
      if (editingTask) {
        await taskService.updateTask(editingTask.id, payload as TaskUpdateRequest);
      } else {
        await taskService.createTask(payload as TaskCreateRequest);
      }
      setShowForm(false);
      setEditingTask(null);
      setFormData(initialFormData);
      setFormDueDate(null);
      fetchTasks();
    } catch (err) {
      setError(editingTask ? 'Failed to update task.' : 'Failed to create task.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      category_id: task.category_id || '',
    });
    setFormDueDate(task.due_date ? new Date(task.due_date) : null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setIsLoading(true);
      setError(null);
      try {
        await taskService.deleteTask(id);
        fetchTasks();
      } catch (err) {
        setError('Failed to delete task.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const openCreateForm = () => {
    setEditingTask(null);
    setFormData(initialFormData);
    setFormDueDate(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setFormData(initialFormData);
    setFormDueDate(null);
  };

  return (
    <div className="@container">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h2 className="text-slate-900 text-3xl font-bold">Tasks</h2>
        <button onClick={openCreateForm} className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors">
          <AddCircleOutlineOutlinedIcon sx={{ fontSize: '1.125rem' }} />
          <span className="truncate">New Task</span>
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}
      {isLoading && <div className="mb-4">Loading...</div>}

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-semibold mb-4">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label htmlFor="title" className="block text-sm font-medium text-slate-700">Title</label><input type="text" name="title" id="title" value={formData.title} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div>
            <div><label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label><textarea name="description" id="description" value={formData.description || ''} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea></div>
            <div><label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label><select name="status" id="status" value={formData.status} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">{statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
            <div><label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label><select name="priority" id="priority" value={formData.priority} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">{priorityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
            <div><label htmlFor="due_date" className="block text-sm font-medium text-slate-700">Due Date</label><DatePicker selected={formDueDate} onChange={handleDateChange} dateFormat="yyyy-MM-dd" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" wrapperClassName="w-full" /></div>
            <div><label htmlFor="category_id" className="block text-sm font-medium text-slate-700">Category</label><select name="category_id" id="category_id" value={formData.category_id || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"><option value="">No Category</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800">{editingTask ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {!isLoading && tasks.length === 0 && !showForm && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">No tasks found. Add a task to get started!</td></tr>
            )}
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-900 text-sm">{task.title}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{statusOptions.find(s => s.value === task.status)?.label || task.status}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{priorityOptions.find(p => p.value === task.priority)?.label || task.priority}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{task.due_date || 'N/A'}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{task.category?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(task)} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors" aria-label="edit task">
                    <EditOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" aria-label="delete task">
                    <DeleteOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TasksPage;
