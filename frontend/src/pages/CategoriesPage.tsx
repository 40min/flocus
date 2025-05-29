import React, { useState, useEffect, useCallback } from 'react';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { Category, CategoryCreateRequest, CategoryUpdateRequest } from '../types/category';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';

const colorOptions = [
  { name: 'Blue', value: '#3B82F6',bgColor: 'bg-blue-500', textColor: 'text-blue-700', ringColor: 'ring-blue-500' },
  { name: 'Green', value: '#10B981', bgColor: 'bg-green-500', textColor: 'text-green-700', ringColor: 'ring-green-500' },
  { name: 'Yellow', value: '#F59E0B', bgColor: 'bg-yellow-500', textColor: 'text-yellow-700', ringColor: 'ring-yellow-500' },
  { name: 'Red', value: '#EF4444', bgColor: 'bg-red-500', textColor: 'text-red-700', ringColor: 'ring-red-500' },
  { name: 'Purple', value: '#8B5CF6', bgColor: 'bg-purple-500', textColor: 'text-purple-700', ringColor: 'ring-purple-500' },
  { name: 'Pink', value: '#EC4899', bgColor: 'bg-pink-500', textColor: 'text-pink-700', ringColor: 'ring-pink-500' },
  { name: 'Indigo', value: '#6366F1', bgColor: 'bg-indigo-500', textColor: 'text-indigo-700', ringColor: 'ring-indigo-500' },
  { name: 'Gray', value: '#6B7280', bgColor: 'bg-gray-500', textColor: 'text-gray-700', ringColor: 'ring-gray-500' },
];

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryCreateRequest | CategoryUpdateRequest>({
    name: '',
    description: '',
    color: colorOptions[0].value,
  });

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (err) {
      setError('Failed to fetch categories.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleColorChange = (colorValue: string) => {
    setFormData({ ...formData, color: colorValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData as CategoryUpdateRequest);
      } else {
        await createCategory(formData as CategoryCreateRequest);
      }
      setShowForm(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', color: colorOptions[0].value });
      fetchCategories(); // Refresh categories list
    } catch (err) {
      setError(editingCategory ? 'Failed to update category.' : 'Failed to create category.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || colorOptions[0].value,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      setIsLoading(true);
      setError(null);
      try {
        await deleteCategory(id);
        fetchCategories(); // Refresh categories list
      } catch (err) {
        setError('Failed to delete category.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const openCreateForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: colorOptions[0].value });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: colorOptions[0].value });
  };

  const getColorDetails = (colorValue?: string) => {
    return colorOptions.find(c => c.value === colorValue) || { name: 'Custom', value: colorValue, bgColor: 'bg-gray-500', textColor: 'text-gray-700', ringColor: 'ring-gray-500' };
  };


  return (
    <div className="@container">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h2 className="text-slate-900 text-3xl font-bold">Categories</h2>
        <button
          onClick={openCreateForm}
          className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors"
        >
          <AddCircleOutlineOutlinedIcon sx={{ fontSize: '1.125rem' }} />
          <span className="truncate">New Category</span>
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}
      {isLoading && <div className="mb-4">Loading...</div>}

      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-semibold mb-4">{editingCategory ? 'Edit Category' : 'Create New Category'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">Name</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
              <textarea name="description" id="description" value={formData.description || ''} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      type="button"
                      key={color.value}
                      onClick={() => handleColorChange(color.value)}
                      className={`size-8 rounded-full ${color.bgColor} ${formData.color === color.value ? `ring-2 ring-offset-2 ${color.ringColor}` : ''}`}
                      aria-label={color.name}
                    />
                  ))}
                </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800">{editingCategory ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">Color</th>
              <th className="px-6 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {categories.map((category) => {
              const colorDetail = getColorDetails(category.color);
              return (
                <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 text-sm">{category.name}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm max-w-xs truncate">{category.description}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 rounded-full ${colorDetail.bgColor.replace('bg-','bg-').replace('500', '100')} px-3 py-1 text-xs font-medium ${colorDetail.textColor}`}>
                      <span className={`size-2 rounded-full ${colorDetail.bgColor}`}></span>
                      {colorDetail.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(category)} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                      <EditOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                    </button>
                    <button onClick={() => handleDelete(category.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                      <DeleteOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoriesPage;
