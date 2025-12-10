import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import FilterSelect from '../../../../components/ui/FilterSelect';
import DraggableDataTable, { ColumnDefinition } from '../../../../components/ui/DraggableDataTable';
import CrudModal from '../../../../components/ui/CrudModal';
import {
  fetchItemCategories,
  fetchItemTypes,
  createType,
  updateType,
  deleteType,
} from '../../../../services/commonItemService';

interface Category { id: number; name: string; }
interface Type { id: number; name: string; category: Category; }

const TypesTab: React.FC = () => {
  const [cats, setCats]       = useState<Category[]>([]);
  const [types, setTypes]     = useState<Type[]>([]);
  const [filter, setFilter]   = useState<number|''>('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Type|null>(null);
  const [name, setName]           = useState('');
  const [catId, setCatId]         = useState<number|''>('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        fetchItemCategories(),
        fetchItemTypes(),
      ]);
      setCats(cRes.data.results || cRes.data);
      setTypes(tRes.data.results || tRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openForm(t?: Type) {
    setEditing(t || null);
    setName(t?.name || '');
    setCatId(t?.category.id || '');
    setModalOpen(true);
  }

  async function handleSave() {
    try {
      const payload = { name, category_id: catId };
      console.log("the payload", payload)

      if (editing) await updateType(editing.id, payload);
      else         await createType(payload);
      await load();
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save type:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this type?')) return;
    try {
      await deleteType(id);
      setTypes(types.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete type:', error);
    }
  }

  const filtered = types.filter(t => !filter || t.category.id === filter);

  const columns: ColumnDefinition[] = [
    { 
      accessor: 'name', 
      title: 'Name',
      sortable: true,
      width: '40%'
    },
    { 
      accessor: 'category.name', 
      title: 'Category',
      sortable: true,
      width: '40%'
    },
    {
      accessor: 'actions',
      title: 'Actions',
      width: '20%',
      textAlign: 'center',
      render: (item: Type) => (
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
        data={filtered}
        columns={columns}
        loading={loading}
        title="Types"
        exportFileName="types"
        storeKey="types-table"
        onRefreshData={load}
        actionButtons={
          <button
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => openForm()}
          >
            <Plus className="w-4 h-4" /> Add Type
          </button>
        }
        extraFilters={
          <FilterSelect
            options={cats.map(c => ({ value: c.id, label: c.name }))}
            value={filter}
            placeholder="All Categories"
            onChange={val => setFilter(val as number|'' )}
          />
        }
        quickCheckFields={['id', 'name', 'category.name']}
      />

      <CrudModal
        title={editing ? 'Edit Type' : 'Add Type'}
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      >
        <label className="block mb-2">Category</label>
        <FilterSelect
          options={cats.map(c => ({ value: c.id, label: c.name }))}
          value={catId}
          placeholder="Select category"
          onChange={val => setCatId(val as number|'' )}
        />
        <label className="block mb-2 mt-4">Name</label>
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

export default TypesTab; 