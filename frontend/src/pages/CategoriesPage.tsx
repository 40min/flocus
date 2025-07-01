import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Category } from '../types/category';
import { deleteCategory } from '../services/categoryService';
import { useCategories } from '../hooks/useCategories';
import Button from '../components/Button';
import CreateCategoryModal from '../components/modals/CreateCategoryModal';
import { colorOptions } from 'constants/colors';

const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading, error } = useCategories();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleAddCategoryClick = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      console.error("Failed to delete category:", err);
      // Optionally, display an error message to the user
    }
  };

  const handleModalSubmitSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    // The modal will close itself, but we also ensure our state is clean.
    handleModalClose();
  };

  const getColorDetails = (colorValue: string | undefined) => {
    return colorOptions.find(option => option.value === colorValue) || { name: 'Unknown', value: '#000000', bgColor: 'bg-gray-500', textColor: 'text-gray-700', ringColor: 'ring-gray-500' };
  };

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Loading categories...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Categories</h1>
        <Button onClick={handleAddCategoryClick} variant="primary" size="medium">
          <Plus className="h-5 w-5 mr-2" />
          Add New Category
        </Button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error.message}</div>}

      <CreateCategoryModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmitSuccess={handleModalSubmitSuccess}
        editingCategory={editingCategory}
      />

      <div className="bg-white shadow-sm rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">All Categories</h2>
        </div>
        <ul className="divide-y divide-slate-200">
          {categories.length === 0 ? (
            <li className="p-6 text-center text-slate-500">No categories found. Click "Add New Category" to create one.</li>
          ) : (
            categories.map((category) => {
              const { bgColor, textColor, name: colorName } = getColorDetails(category.color);
              return (
                <li key={category.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors duration-150">
                  <div className="flex items-center">
                    <span className={`h-4 w-4 rounded-full mr-3 ${bgColor}`} title={colorName}></span>
                    <div>
                      <p className="text-lg font-medium text-slate-900">{category.name}</p>
                      {category.description && <p className="text-sm text-slate-500">{category.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(category)}
                      title="Edit Category"
                    >
                      <Edit className="h-5 w-5 text-slate-500 hover:text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                      title="Delete Category"
                    >
                      <Trash2 className="h-5 w-5 text-slate-500 hover:text-red-600" />
                    </Button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

export default CategoriesPage;
