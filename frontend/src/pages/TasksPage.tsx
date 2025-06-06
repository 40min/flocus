import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatDueDate, formatDurationFromMinutes } from 'lib/utils';
// DatePicker is now handled by CreateTaskModal
// import DatePicker from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Task, TaskCreateRequest } from 'types/task';
import { Category } from 'types/category';
import * as taskService from 'services/taskService';
import * as categoryService from 'services/categoryService';
import CreateTaskModal from 'components/modals/CreateTaskModal'; // Import the modal

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Keep for table loading
  const [error, setError] = useState<string | null>(null);
  // const [showForm, setShowForm] = useState<boolean>(false); // Replaced by isModalOpen
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskForStats, setSelectedTaskForStats] = useState<Task | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);

  const initialFormData: TaskCreateRequest = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    due_date: null,
    category_id: '',
  };


  const fetchTasks = useCallback(async () => {
    setIsLoading(true); // Keep for table loading
    setError(null);
    try {
      const data = await taskService.getAllTasks();
      setTasks(data);
    } catch (err) {
      setError('Failed to fetch tasks.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoryService.getAllCategories();
      setCategories(data);
    } catch (err) {
      setError(prev => prev ? `${prev} Failed to fetch categories.` : 'Failed to fetch categories.');
      console.error(err);
    }
  }, []);

  // useEffect for fetching tasks (runs once on mount)
  const hasFetchedTasks = useRef(false);
  useEffect(() => {
    if (!hasFetchedTasks.current) {
      fetchTasks();
      hasFetchedTasks.current = true;
    }
  }, [fetchTasks]); // fetchTasks is stable

  // useEffect for fetching categories (runs on mount and when editingTask changes, or fetchCategories itself changes)
  const hasFetchedCategories = useRef(false);
  useEffect(() => {
    if (!hasFetchedCategories.current) {
      fetchCategories();
      hasFetchedCategories.current = true;
    }
  }, [fetchCategories]);

  // handleInputChange, handleDateChange, and handleSubmit are moved to CreateTaskModal

  const handleFormSubmitSuccess = () => {
    fetchTasks(); // Refresh tasks list
    setEditingTask(null); // Reset editing task
    setIsModalOpen(false); // Close modal
  };


  const handleEdit = (task: Task) => {
    setEditingTask(task);
    // Form data setting is now handled by CreateTaskModal's useEffect
    setIsModalOpen(true);
  };

  const openStatsModal = (task: Task) => {
    setSelectedTaskForStats(task);
    setIsStatsModalOpen(true);
  };

  const closeStatsModal = () => {
    setIsStatsModalOpen(false);
    setSelectedTaskForStats(null);
  };

  const TaskStatisticsModal = React.lazy(() => import('../components/modals/TaskStatisticsModal'));

  const handleDelete = async (id: string) => {
    setIsLoading(true); // Keep for table loading
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
  };

  const openCreateModal = () => {
    setEditingTask(null); // Ensure we are in "create" mode
    // Initial form data is now set by CreateTaskModal's useEffect
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setEditingTask(null); // Clear editing task on close
    // Form data reset is handled by CreateTaskModal's useEffect
  };

  return (
    <div className="@container">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h2 className="text-slate-900 text-3xl font-bold">Tasks</h2>
        <button onClick={openCreateModal} className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors">
          <AddCircleOutlineOutlinedIcon sx={{ fontSize: '1.125rem' }} />
          <span className="truncate">New Task</span>
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}
      {/* isLoading for table, not for modal form anymore */}
      {isLoading && tasks.length === 0 && <div className="mb-4">Loading tasks...</div>}


      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={closeCreateModal}
        onSubmitSuccess={handleFormSubmitSuccess}
        editingTask={editingTask}
        categories={categories}
        initialFormData={initialFormData}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
      />

      {isStatsModalOpen && selectedTaskForStats && (
        <React.Suspense fallback={<div>Loading statistics...</div>}>
          <TaskStatisticsModal
            isOpen={isStatsModalOpen}
            onClose={closeStatsModal}
            task={selectedTaskForStats}
          />
        </React.Suspense>
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
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {!isLoading && tasks.length === 0 && ( // Removed !showForm condition
              <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">No tasks found. Add a task to get started!</td></tr>
            )}
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-900 text-sm">{task.title}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{statusOptions.find(s => s.value === task.status)?.label || task.status}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{priorityOptions.find(p => p.value === task.priority)?.label || task.priority}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{formatDueDate(task.due_date ?? null)}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">
                  {task.category ? (
                    <span
                      style={{ backgroundColor: task.category.color || '#ccc' }}
                      className="px-2 py-1 rounded-md text-xs font-medium text-white" // Assuming white text is generally readable
                    >
                      {task.category.name}
                    </span>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">{formatDurationFromMinutes(task.statistics?.lasts_min)}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => openStatsModal(task)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" aria-label="view statistics">
                    <InfoOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                  </button>
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
