import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { Category, CategoryCreateRequest, CategoryUpdateRequest } from '../types/category';
import { createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { useCategories } from '../hooks/useCategories';

const colorOptions = [
  { name: 'Blue', value: '#3B82F6',bgColor: 'bg-blue-500', textColor: 'text-blue-700', ringColor: 'ring-blue-500' },
  { name: 'Green', value: '#10B981', bgColor: 'bg-green-500', textColor: 'text-green-700', ringColor: 'ring-green-500' },
  { name: 'Yellow', value: '#F59E0B', bgColor: 'bg-yellow-500', textColor: 'text-yellow-700', ringColor: 'ring-yellow-500' },
  { name: 'Red', value: '#EF4444', bgColor: 'bg-red-500', textColor: 'text-red-700', ringColor: 'ring-red-500' },
  { name: 'Purple', value: '#8B5CF6', bgColor: 'bg-purple-500', textColor: 'text-purple-700', ringColor: 'ring-purple-500' },
  { name: 'Pink', value: '#EC4899', bgColor: 'bg-pink-500', textColor: 'text-pink-700', ringColor: 'ring-pink-500' },
  { name: 'Indigo', value: '#6366F1', bgColor: 'bg-indigo-500', textColor: 'text-indigo-700', ringColor: 'ring-indigo-500' },
];

const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading, error } = useCategories();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  interface CategoryFormData {
    name: string;
    description?: string;
    color: string;
  }

  const { register, handleSubmit: handleFormSubmit, formState: { errors }, setValue, reset, watch } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      description: '',
      color: colorOptions[0].value,
    }
  });

  const watchedColor = watch("color");

  useEffect(() => {
    if (editingCategory) {
      reset({
        name: editingCategory.name,
        description: editingCategory.description || '',
        color: editingCategory.color || colorOptions[0].value,
      });
    } else {
      reset({
        name: '',
        description: '',
        color: colorOptions[0].value,
      });
    }
  }, [editingCategory, reset]);


  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data as CategoryUpdateRequest);
      } else {
        await createCategory(data as CategoryCreateRequest);
      }
      setShowForm(false);
      setEditingCategory(null);
      reset(); // Reset form to default values
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      setFormError(editingCategory ? 'Failed to update category.' : 'Failed to create category.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    // useEffect will now handle resetting the form with category data
    setShowForm(true);
    setFormError(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory(id);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      console.error('Failed to delete category.', err);
    }
  };

  const handleAddCategoryClick = () => {
    setEditingCategory(null);
    // useEffect will now handle resetting the form to default
    setShowForm(true);
    setFormError(null);
  };

  const closeForm = () => {
    setEditingCategory(null);
    reset(); // Reset form to default values
    setShowForm(false);
  };

  const getColorDetails = (colorValue: string | undefined) => {
    return colorOptions.find(option => option.value === colorValue) || colorOptions[0];
  };

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
        <p className="text-slate-600 mt-1">Manage your task categories.</p>
      </header>

      <div className="flex justify-end mb-6">
        <button
          onClick={handleAddCategoryClick}
          className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          <AddCircleOutlineOutlinedIcon className="mr-2" />
          Add New Category
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error.message}</div>}

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">{editingCategory ? 'Edit Category' : 'Create New Category'}</h2>
          <form onSubmit={handleFormSubmit(onSubmit)}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                id="name"
                {...register("name", { required: "Name is required" })}
                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-slate-300'} rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
              <textarea
                id="description"
                {...register("description")}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
              ></textarea>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
              <input type="hidden" {...register("color", { required: "Color is required" })} />
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center ${option.bgColor} ${watchedColor === option.value ? `ring-2 ${option.ringColor} ring-offset-2` : ''}`}
                    onClick={() => setValue("color", option.value, { shouldValidate: true })}
                    title={option.name}
                  >
                    {watchedColor === option.value && (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
              {errors.color && <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>}
            </div>
            {formError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{formError}</div>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50">{isSubmitting ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">All Categories</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Color</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">Loading categories...</td></tr>
              )}
              {!isLoading && !error && categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                    No categories found. Add a category to organize your tasks!
                  </td>
                </tr>
              )}
              {!isLoading && !error && categories.map((category: Category) => {
                const colorDetail = getColorDetails(category.color);
                return (
                  <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{category.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{category.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorDetail.bgColor} ${colorDetail.textColor}`}>
                        {colorDetail.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        title="Edit Category"
                      >
                        <EditOutlinedIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Category"
                      >
                        <DeleteOutlinedIcon />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;
