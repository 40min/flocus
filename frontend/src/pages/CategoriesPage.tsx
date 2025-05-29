import React from 'react';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

const CategoriesPage: React.FC = () => {
  return (
    <div className="@container">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h2 className="text-slate-900 text-3xl font-bold">Categories</h2>
        <button className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors">
          <AddCircleOutlineOutlinedIcon sx={{ fontSize: '1.125rem' }} />
          <span className="truncate">New Category</span>
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-slate-700 text-xs font-semibold uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-slate-700 text-xs font-semibold uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-slate-700 text-xs font-semibold uppercase tracking-wider">Color</th>
              <th className="px-6 py-4 text-slate-700 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-slate-900 text-sm">Work</td>
              <td className="px-6 py-4 text-slate-600 text-sm max-w-xs truncate">Tasks related to professional work.</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  <span className="size-2 rounded-full bg-blue-500"></span>
                  Blue
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                  <EditOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                </button>
                <button className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <DeleteOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                </button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-slate-900 text-sm">Personal</td>
              <td className="px-6 py-4 text-slate-600 text-sm max-w-xs truncate">Tasks related to personal life.</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  <span className="size-2 rounded-full bg-green-500"></span>
                  Green
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                  <EditOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                </button>
                <button className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <DeleteOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                </button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-slate-900 text-sm">Learning</td>
              <td className="px-6 py-4 text-slate-600 text-sm max-w-xs truncate">Tasks related to learning and development.</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                  <span className="size-2 rounded-full bg-yellow-500"></span>
                  Yellow
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <button className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                  <EditOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                </button>
                <button className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <DeleteOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default CategoriesPage;
