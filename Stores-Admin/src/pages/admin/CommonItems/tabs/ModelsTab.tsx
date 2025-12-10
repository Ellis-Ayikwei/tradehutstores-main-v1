import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import FilterSelect from '../../../../components/ui/FilterSelect';
import DraggableDataTable, { ColumnDefinition } from '../../../../components/ui/DraggableDataTable';
import CrudModal from '../../../../components/ui/CrudModal';
import {
  fetchItemBrands,
  fetchItemModels,
  createModel,
  updateModel,
  deleteModel,
} from '../../../../services/commonItemService';

interface Brand { id: number; name: string; }
interface Model { 
  id: number; 
  name: string; 
  brand: Brand;
  weight?: number | string | null;
  dimensions?: { length?: string | number; width?: string | number; height?: string | number; unit?: string } | null;
  item_type?: string;
}

const ModelsTab: React.FC = () => {
  const [brands, setBrands]   = useState<Brand[]>([]);
  const [models, setModels]   = useState<Model[]>([]);
  const [filter, setFilter]   = useState<number|''>('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Model|null>(null);
  const [name, setName]           = useState('');
  const [brandId, setBrandId]     = useState<number|''>('');
  const [weight, setWeight]       = useState<string>('');
  const [dimLength, setDimLength] = useState<string>('');
  const [dimWidth, setDimWidth]   = useState<string>('');
  const [dimHeight, setDimHeight] = useState<string>('');
  const [dimUnit, setDimUnit]     = useState<string>('cm');
  const [itemType, setItemType]   = useState<string>('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [bRes, mRes] = await Promise.all([
        fetchItemBrands(),
        fetchItemModels(),
      ]);
      setBrands(bRes.data.results || bRes.data);
      setModels(mRes.data.results || mRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openForm(m?: Model) {
    setEditing(m || null);
    setName(m?.name || '');
    setBrandId(m?.brand.id || '');
    setWeight(m?.weight?.toString() || '');
    setDimLength(m?.dimensions?.length?.toString() || '');
    setDimWidth(m?.dimensions?.width?.toString() || '');
    setDimHeight(m?.dimensions?.height?.toString() || '');
    setDimUnit(m?.dimensions?.unit || 'cm');
    setItemType(m?.item_type || '');
    setModalOpen(true);
  }

  async function handleSave() {
    try {
      const dimensions = (dimLength || dimWidth || dimHeight) ? {
        length: dimLength || '',
        width: dimWidth || '',
        height: dimHeight || '',
        unit: dimUnit || 'cm'
      } : null;

      const payload: any = { 
        name, 
        brand_id: brandId,
        ...(weight && { weight: parseFloat(weight) }),
        ...(dimensions && { dimensions }),
        ...(itemType && { item_type: itemType }),
      };
      
      if (editing) await updateModel(editing.id, payload);
      else         await createModel(payload);
      await load();
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this model?')) return;
    try {
      await deleteModel(id);
      setModels(models.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  }

  const filtered = models.filter(m => !filter || m.brand.id === filter);

  const columns: ColumnDefinition[] = [
    { 
      accessor: 'name', 
      title: 'Name',
      sortable: true,
      width: '25%'
    },
    { 
      accessor: 'brand.name', 
      title: 'Brand',
      sortable: true,
      width: '20%'
    },
    {
      accessor: 'item_type',
      title: 'Type',
      sortable: true,
      width: '15%',
      render: (item: Model) => item.item_type || '-'
    },
    {
      accessor: 'weight',
      title: 'Weight (kg)',
      sortable: true,
      width: '12%',
      render: (item: Model) => item.weight ? `${item.weight}` : '-'
    },
    {
      accessor: 'dimensions',
      title: 'Dimensions',
      sortable: false,
      width: '18%',
      render: (item: Model) => {
        if (!item.dimensions) return '-';
        const dims = item.dimensions;
        const unit = dims.unit || 'cm';
        return dims.length && dims.width && dims.height 
          ? `${dims.length} × ${dims.width} × ${dims.height} ${unit}`
          : '-';
      }
    },
    {
      accessor: 'actions',
      title: 'Actions',
      width: '10%',
      textAlign: 'center',
      render: (item: Model) => (
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
        title="Models"
        exportFileName="models"
        storeKey="models-table"
        onRefreshData={load}
        actionButtons={
          <button
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => openForm()}
          >
            <Plus className="w-4 h-4" /> Add Model
          </button>
        }
        extraFilters={
          <FilterSelect
            options={brands.map(b => ({ value: b.id, label: b.name }))}
            value={filter}
            placeholder="All Brands"
            onChange={val => setFilter(val as number|'' )}
          />
        }
        quickCheckFields={['id', 'name', 'brand.name']}
      />

      <CrudModal
        title={editing ? 'Edit Model' : 'Add Model'}
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      >
        <label className="block mb-2">Brand</label>
        <FilterSelect
          options={brands.map(b => ({ value: b.id, label: b.name }))}
          value={brandId}
          placeholder="Select brand"
          onChange={val => setBrandId(val as number|'' )}
        />
        <label className="block mb-2 mt-4">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border w-full p-2"
        />
        
        <label className="block mb-2 mt-4">Weight (kg)</label>
        <input
          type="number"
          step="0.01"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          className="border w-full p-2"
          placeholder="e.g., 1500"
        />

        <label className="block mb-2 mt-4">Dimensions</label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Length</label>
            <input
              type="text"
              value={dimLength}
              onChange={e => setDimLength(e.target.value)}
              className="border w-full p-2"
              placeholder="Length"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Width</label>
            <input
              type="text"
              value={dimWidth}
              onChange={e => setDimWidth(e.target.value)}
              className="border w-full p-2"
              placeholder="Width"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Height</label>
            <input
              type="text"
              value={dimHeight}
              onChange={e => setDimHeight(e.target.value)}
              className="border w-full p-2"
              placeholder="Height"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Unit</label>
            <FilterSelect
              options={[
                { value: 'cm', label: 'cm' },
                { value: 'm', label: 'm' },
                { value: 'ft', label: 'ft' },
                { value: 'mm', label: 'mm' },
              ]}
              value={dimUnit}
              placeholder="Unit"
              onChange={val => setDimUnit(val as string)}
            />
          </div>
        </div>

        <label className="block mb-2 mt-4">Vehicle Type</label>
        <FilterSelect
          options={[
            { value: '', label: 'None' },
            { value: 'SUV', label: 'SUV' },
            { value: 'Sedan', label: 'Sedan' },
            { value: 'Hatchback', label: 'Hatchback' },
            { value: 'Coupe', label: 'Coupe' },
            { value: 'Convertible', label: 'Convertible' },
            { value: 'Wagon', label: 'Wagon' },
            { value: 'Van', label: 'Van' },
            { value: 'Pickup', label: 'Pickup' },
            { value: 'Truck', label: 'Truck' },
            { value: 'Sports Car', label: 'Sports Car' },
            { value: 'Luxury', label: 'Luxury' },
            { value: 'Electric', label: 'Electric' },
            { value: 'Hybrid', label: 'Hybrid' },
            { value: 'Other', label: 'Other' },
          ]}
          value={itemType}
          placeholder="Select vehicle type"
          onChange={val => setItemType(val as string)}
        />
      </CrudModal>
    </>
  );
};

export default ModelsTab; 