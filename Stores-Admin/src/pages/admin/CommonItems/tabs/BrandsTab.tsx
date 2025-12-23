import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import FilterSelect from '../../../../components/ui/FilterSelect';
import DraggableDataTable, { ColumnDefinition } from '../../../../components/ui/DraggableDataTable';
import CrudModal from '../../../../components/ui/CrudModal';
import {
  fetchItemCategories,
  fetchItemBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from '../../../../services/commonItemService';

interface Category { id: number; name: string; }
interface Brand    { id: number; name: string; category: Category; }

const BrandsTab: React.FC = () => {
  const [cats, setCats]       = useState<Category[]>([]);
  const [brands, setBrands]   = useState<Brand[]>([]);
  const [filter, setFilter]   = useState<number|''>('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Brand|null>(null);
  const [name, setName]           = useState('');
  const [catId, setCatId]         = useState<number|''>('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        fetchItemCategories(),
        fetchItemBrands(),
      ]);
      setCats(cRes.data.results || cRes.data);
      setBrands(bRes.data.results || bRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openForm(b?: Brand) {
    setEditing(b || null);
    setName(b?.name || '');
    setCatId(b?.category.id || '');
    setModalOpen(true);
  }

  async function handleSave() {
    try {
      const payload = { name, category_id: catId };
      if (editing) await updateBrand(editing.id, payload);
      else         await createBrand(payload);
      await load();
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save brand:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this brand?')) return;
    try {
      await deleteBrand(id);
      setBrands(brands.filter(b => b.id !== id));
    } catch (error) {
      console.error('Failed to delete brand:', error);
    }
  }

  const filtered = brands.filter(b => !filter || b.category.id === filter);

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
      render: (item: Brand) => (
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
        title="Brands"
        exportFileName="brands"
        storeKey="brands-table"
        onRefreshData={load}
        actionButtons={
          <button
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => openForm()}
          >
            <Plus className="w-4 h-4" /> Add Brand
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
        title={editing ? 'Edit Brand' : 'Add Brand'}
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

export default BrandsTab; 