import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Category, CategoryCreateRequest, CategoryUpdateRequest } from '../types/category';
import { ApiError } from '../lib/errors';
import { createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { useCategories } from '../hooks/useCategories';
import Button from '../components/Button';
import Input from '../components/Input';

const colorOptions = [
  { name: 'Slate', value: '#64748B', bgColor: 'bg-slate-500', textColor: 'text-slate-700', ringColor: 'ring-slate-500' },
  { name: 'Gray', value: '#6B7280', bgColor: 'bg-gray-500', textColor: 'text-gray-700', ringColor: 'ring-gray-500' },
  { name: 'Zinc', value: '#71717A', bgColor: 'bg-zinc-500', textColor: 'text-zinc-700', ringColor: 'ring-zinc-500' },
  { name: 'Neutral', value: '#737373', bgColor: 'bg-neutral-500', textColor: 'text-neutral-700', ringColor: 'ring-neutral-500' },
  { name: 'Stone', value: '#78716C', bgColor: 'bg-stone-500', textColor: 'text-stone-700', ringColor: 'ring-stone-500' },
  { name: 'Red', value: '#EF4444', bgColor: 'bg-red-500', textColor: 'text-red-700', ringColor: 'ring-red-500' },
  { name: 'Orange', value: '#F97316', bgColor: 'bg-orange-500', textColor: 'text-orange-700', ringColor: 'ring-orange-500' },
  { name: 'Amber', value: '#F59E0B', bgColor: 'bg-amber-500', textColor: 'text-amber-700', ringColor: 'ring-amber-500' },
  { name: 'Yellow', value: '#EAB308', bgColor: 'bg-yellow-500', textColor: 'text-yellow-700', ringColor: 'ring-yellow-500' },
  { name: 'Lime', value: '#84CC16', bgColor: 'bg-lime-500', textColor: 'text-lime-700', ringColor: 'ring-lime-500' },
  { name: 'Green', value: '#22C55E', bgColor: 'bg-green-500', textColor: 'text-green-700', ringColor: 'ring-green-500' },
  { name: 'Emerald', value: '#10B981', bgColor: 'bg-emerald-500', textColor: 'text-emerald-700', ringColor: 'ring-emerald-500' },
  { name: 'Teal', value: '#14B8A6', bgColor: 'bg-teal-500', textColor: 'text-teal-700', ringColor: 'ring-teal-500' },
  { name: 'Cyan', value: '#06B6D4', bgColor: 'bg-cyan-500', textColor: 'text-cyan-700', ringColor: 'ring-cyan-500' },
  { name: 'Sky', value: '#0EA5E9', bgColor: 'bg-sky-500', textColor: 'text-sky-700', ringColor: 'ring-sky-500' },
  { name: 'Blue', value: '#3B82F6', bgColor: 'bg-blue-500', textColor: 'text-blue-700', ringColor: 'ring-blue-500' },
  { name: 'Indigo', value: '#6366F1', bgColor: 'bg-indigo-500', textColor: 'text-indigo-700', ringColor: 'ring-indigo-500' },
  { name: 'Violet', value: '#8B5CF6', bgColor: 'bg-violet-500', textColor: 'text-violet-700', ringColor: 'ring-violet-500' },
  { name: 'Purple', value: '#A855F7', bgColor: 'bg-purple-500', textColor: 'text-purple-700', ringColor: 'ring-purple-500' },
  { name: 'Fuchsia', value: '#D946EF', bgColor: 'bg-fuchsia-500', textColor: 'text-fuchsia-700', ringColor: 'ring-fuchsia-500' },
  { name: 'Pink', value: '#EC4899', bgColor: 'bg-pink-500', textColor: 'text-pink-700', ringColor: 'ring-pink-500' },
  { name: 'Rose', value: '#F43F5E', bgColor: 'bg-rose-500', textColor: 'text-rose-700', ringColor: 'ring-rose-500' },
];

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string({ required_error: "Color is required" }),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading, error } = useCategories();

  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { register, handleSubmit: handleFormSubmit, formState: { errors, isSubmitting }, setValue, reset, watch } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: colorOptions[0].value,
    },
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
    } catch (err: any) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError(editingCategory ? 'Failed to update category.' : 'Failed to create category.');
      }
      console.error(err);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    // useEffect will now handle resetting the form with category data
    setShowForm(true);
    setFormError(null);
  };

  const handleDelete = async (id: string) => {

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
        <h1 className="text-3xl font-bold text-heading-main">Categories</h1>
        <p className="text-heading-sub mt-1">Manage your task categories.</p>
      </header>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error.message}</div>}

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">{editingCategory ? 'Edit Category' : 'Create New Category'}</h2>
          <form onSubmit={handleFormSubmit(onSubmit)}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <Input
                type="text"
                id="name"
                {...register("name")}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
              <Input
                as="textarea"
                id="description"
                {...register("description")}
                rows={3}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
              <input type="hidden" {...register("color")} />
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button" // Add this line
                    variant="ghost"
                    size="icon"
                    onClick={() => setValue("color", option.value, { shouldValidate: true })}
                    className={`rounded-full ${option.bgColor} ${watchedColor === option.value ? `ring-2 ${option.ringColor} ring-offset-2` : ''}`}
                    title={option.name}
                  >
                    {watchedColor === option.value && (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </Button>
                ))}
              </div>
              {errors.color && <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>}
            </div>
            {formError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{formError}</div>}
            <div className="flex justify-end gap-3">
              <Button type="button" onClick={closeForm} variant="secondary" size="small">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} variant="slate" size="small">{isSubmitting ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">All Categories</h2>
          <Button
            onClick={handleAddCategoryClick}
            variant="slate"
            size="medium"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Add New Category
          </Button>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-heading-main">{category.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-heading-sub">{category.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorDetail.bgColor} ${colorDetail.textColor}`}>
                        {colorDetail.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                        title="Edit Category"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                        title="Delete Category"
                      >
                        <Trash2 size={18} />
                      </Button>
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
