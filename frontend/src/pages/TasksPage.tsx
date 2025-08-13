import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDueDate, formatDurationFromSeconds } from "../utils/utils";
import { Plus, Edit, Trash2, Info } from "lucide-react"; // Updated icons
import { Button } from "@/components/ui/button";
import { Task, TaskCreateRequest } from "types/task";
import * as taskService from "services/taskService";
import CreateTaskModal from "components/modals/CreateTaskModal";
import { useTasks, useTasksByCategory } from "hooks/useTasks";
import { useCategories } from "hooks/useCategories";
import { useTimer } from "../hooks/useTimer";
import TaskStatisticsModal from "../components/modals/TaskStatisticsModal";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const TasksPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskForStats, setSelectedTaskForStats] = useState<Task | null>(
    null
  );
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const { currentTaskId, stopCurrentTask } = useTimer();

  const queryClient = useQueryClient();
  const {
    data: allTasks,
    isLoading: isLoadingAll,
    error: errorAll,
  } = useTasks();
  const {
    data: categoryTasks,
    isLoading: isLoadingCategory,
    error: errorCategory,
  } = useTasksByCategory(selectedCategoryId);

  const tasks = selectedCategoryId ? categoryTasks : allTasks;
  const isLoading = selectedCategoryId ? isLoadingCategory : isLoadingAll;
  const tasksError = selectedCategoryId ? errorCategory : errorAll;

  const { data: categories, error: categoriesError } = useCategories();

  const initialFormData: TaskCreateRequest = {
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    due_date: null,
    category_id: "",
  };

  // handleInputChange, handleDateChange, and handleSubmit are moved to CreateTaskModal

  const handleFormSubmitSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    setEditingTask(null);
    setIsModalOpen(false);
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

  const handleDelete = async (id: string) => {
    if (id === currentTaskId) {
      await stopCurrentTask();
    }
    try {
      await taskService.deleteTask(id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err) {
      console.error(`Failed to delete task with id ${id}:`, err);
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
    <div className="p-8 @container">
      {" "}
      {/* Added p-8 for consistency, kept @container */}
      <header className="mb-8">
        <h1 className="text-slate-900 text-3xl font-bold">Tasks</h1>
        <p className="text-slate-600 mt-1">
          Manage your tasks and track their progress.
        </p>
      </header>
      {tasksError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {tasksError.message}
        </div>
      )}
      {categoriesError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Failed to load categories.
        </div>
      )}
      {/* isLoading for table, not for modal form anymore */}
      {isLoading && <div className="mb-4">Loading tasks...</div>}
      <div className="mb-4">
        <label
          htmlFor="category-filter"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Filter by Category:
        </label>
        <select
          id="category-filter"
          name="category-filter"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={closeCreateModal}
        onSubmitSuccess={handleFormSubmitSuccess}
        editingTask={editingTask}
        categories={categories || []}
        initialFormData={initialFormData}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
      />
      {isStatsModalOpen && selectedTaskForStats && (
        <TaskStatisticsModal
          isOpen={isStatsModalOpen}
          onClose={closeStatsModal}
          task={selectedTaskForStats}
        />
      )}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">All Tasks</h2>
          <Button
            onClick={openCreateModal}
            variant="slate"
            size="medium"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="truncate">New Task</span>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    Loading tasks...
                  </td>
                </tr>
              )}
              {!isLoading && tasksError && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-red-500"
                  >
                    Error: {tasksError.message}
                  </td>
                </tr>
              )}
              {!isLoading && !tasksError && tasks?.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No tasks found. Add a task to get started!
                  </td>
                </tr>
              )}
              {!isLoading &&
                !tasksError &&
                tasks &&
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-900 text-sm">
                      {task.title}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {statusOptions.find((s) => s.value === task.status)
                        ?.label || task.status}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {priorityOptions.find((p) => p.value === task.priority)
                        ?.label || task.priority}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {formatDueDate(task.due_date ?? null)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {task.category ? (
                        <span
                          style={{
                            backgroundColor: task.category.color || "#ccc",
                          }}
                          className="px-2 py-1 rounded-md text-xs font-medium text-white" // Assuming white text is generally readable
                        >
                          {task.category.name}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {formatDurationFromSeconds(
                        task.statistics?.lasts_seconds
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openStatsModal(task)}
                        aria-label="view statistics"
                      >
                        <Info size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(task)}
                        aria-label="edit task"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task.id)}
                        aria-label="delete task"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
