import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import DraggableDataTable, { ColumnDefinition } from '../../../../components/ui/DraggableDataTable';
import CrudModal from '../../../../components/ui/CrudModal';
import {
  fetchItemCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../../../services/commonItemService';

interface Category { id: number; name: string; }

const CategoriesTab: React.FC = () => {
  const [cats, setCats]     = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Category|null>(null);
  const [name, setName]           = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchItemCategories();
      setCats(res.data.results || res.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  }

  function openForm(c?: Category) {
    setEditing(c || null);
    setName(c?.name || '');
    setModalOpen(true);
  }

  async function handleSave() {
    try {
      if (editing) await updateCategory(editing.id, { name });
      else         await createCategory({ name });
      await load();
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      setCats(cats.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  }

  const columns: ColumnDefinition[] = [
    { 
      accessor: 'name', 
      title: 'Name',
      sortable: true,
      width: '60%'
    },
    {
      accessor: 'actions',
      title: 'Actions',
      width: '40%',
      textAlign: 'center',
      render: (item: Category) => (
        <div className="flex gap-2 justify-center">
          <button 
            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50" 
            onClick={() => openForm(item)}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50" 
            onClick={() => handleDelete(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }
  ];

  return (
    <>
      <DraggableDataTable
        data={cats}
        columns={columns}
        loading={loading}
        title="Categories"
        exportFileName="categories"
        storeKey="categories-table"
        onRefreshData={load}
        actionButtons={
          <button
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => openForm()}
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        }
        quickCheckFields={['id', 'name']}
      />

      <CrudModal
        title={editing ? 'Edit Category' : 'Add Category'}
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      >
        <label className="block mb-2">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border w-full p-2"
        />
      </CrudModal>
    </>
  );
};

export default CategoriesTab; 