import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Package, Box, Archive, Home, X, ShieldHalf } from 'lucide-react';
import { Tab, Dialog, Transition } from '@headlessui/react';
import FilterSelect from '../../../../components/ui/FilterSelect';
import DraggableDataTable, { ColumnDefinition } from '../../../../components/ui/DraggableDataTable';
import {
  fetchCommonItems,
  createCommonItem,
  updateCommonItem,
  deleteCommonItem,
  fetchItemCategories,
  fetchItemTypes,
  fetchItemBrands,
  fetchItemModels,
} from '../../../../services/commonItemService';
import renderErrorMessage from '../../../../helper/renderErrorMessage';
import showMessage from '../../../../helper/showMessage';

interface Category { id: string; name: string; }
interface Type     { id: string; name: string; }
interface Brand    { id: string; name: string; }
interface Model    { id: string; name: string; }
interface CommonItem {
  id: string;
  name: string;
  category: Category;
  type: Type;
  brand: Brand;
  model: Model;
  description?: string;
  weight?: number;
  dimensions?: any;
  fragile?: boolean;
  needs_disassembly?: boolean;
  icon?: string;
  color?: string;
  tab_color?: string;
  image?: string;
}

const ItemsTab: React.FC = () => {
  const [items, setItems]     = useState<CommonItem[]>([]);
  const [cats, setCats]       = useState<Category[]>([]);
  const [types, setTypes]     = useState<Type[]>([]);
  const [brands, setBrands]   = useState<Brand[]>([]);
  const [models, setModels]   = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState<string|''>('');
  const [typeFilter, setTypeFilter] = useState<string|''>('');
  const [brandFilter, setBrandFilter] = useState<string|''>('');
  const [modelFilter, setModelFilter] = useState<string|''>('');
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Partial<CommonItem> | null>(null);
  const [form, setForm] = useState<{
    name: string;
    category_id: string | '';
    type_id: string | '';
    brand_id: string | '';
    model_id: string | '';
    description: string;
    weight: string | '';
    length: string | '';
    width: string | '';
    height: string | '';
    fragile: boolean;
    needs_disassembly: boolean;
    icon: string;
    color: string;
    tab_color: string;
    image: string;
  }>({
    name: '',
    category_id: '',
    type_id: '',
    brand_id: '',
    model_id: '',
    description: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    fragile: false,
    needs_disassembly: false,
    icon: '',
    color: '',
    tab_color: '',
    image: '',
  });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [iRes, cRes, tRes] = await Promise.all([
        fetchCommonItems(),
        fetchItemCategories(),
        fetchItemTypes(),
      ]);
      setItems(iRes.data.results || iRes.data);
      setCats(cRes.data.results || cRes.data);
      setTypes(tRes.data.results || tRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTypes(catId?: string) {
    try {
      const res = await fetchItemTypes(catId || '');
      setTypes(res.data.results || res.data);
    } catch (error) {
      console.error('Failed to load types:', error);
    }
  }

  async function loadBrands(catId?: string) {
    try {
      const res = await fetchItemBrands(catId || '');
      setBrands(res.data.results || res.data);
    } catch (error) {
      console.error('Failed to load brands:', error);
    }
  }

  async function loadModels(brId?: string) {
    try {
      const res = await fetchItemModels(brId || '');
      setModels(res.data.results || res.data);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  function openForm(item?: CommonItem) {
    setEditing(item || null);
    setValidationErrors({});
    
    // Parse dimensions if they exist
    let length = '', width = '', height = '';
    if (item?.dimensions) {
      try {
        if (typeof item.dimensions === 'string') {
          // Check if it's a formatted string like "L: 227.8 × W: 119.6 × H: 86.5"
          if (item.dimensions.includes('L:') && item.dimensions.includes('×')) {
            // Extract values from formatted string
            const match = item.dimensions.match(/L:\s*([\d.]+).*W:\s*([\d.]+).*H:\s*([\d.]+)/);
            if (match) {
              length = match[1];
              width = match[2];
              height = match[3];
            }
          } else {
            // Try to parse as JSON
            const dims = JSON.parse(item.dimensions);
            length = dims.length || dims.L ? String(dims.length || dims.L) : '';
            width = dims.width || dims.W ? String(dims.width || dims.W) : '';
            height = dims.height || dims.H ? String(dims.height || dims.H) : '';
          }
        } else {
          // Handle object format
          const dims = item.dimensions;
          length = dims.length || dims.L ? String(dims.length || dims.L) : '';
          width = dims.width || dims.W ? String(dims.width || dims.W) : '';
          height = dims.height || dims.H ? String(dims.height || dims.H) : '';
        }
      } catch (error) {
        console.error('Error parsing dimensions:', error);
      }
    }
    
    setForm({
      name: item?.name || '',
      category_id: item?.category?.id || '',
      type_id: item?.type?.id || '',
      brand_id: item?.brand?.id || '',
      model_id: item?.model?.id || '',
      description: item?.description || '',
      weight: item?.weight ? String(item.weight) : '',
      length,
      width,
      height,
      fragile: item?.fragile || false,
      needs_disassembly: item?.needs_disassembly || false,
      icon: item?.icon || '',
      color: item?.color || '',
      tab_color: item?.tab_color || '',
      image: item?.image || '',
    });
    if (item?.category?.id) {
      loadTypes(item.category.id);
      loadBrands(item.category.id);
    }
    if (item?.brand?.id)    loadModels(item.brand.id);
    setModalOpen(true);
  }

  async function handleSave() {
    setValidationErrors({});
    const errors: {[key: string]: string} = {};
  
    setSaving(true);

    try {
      // Helper function to convert empty strings to null
      const toNullIfEmpty = (value: string | undefined | null) => {
        if (!value || value.trim() === '') return null;
        return value;
      };
      
      // Helper function to convert string to number or null
      const toNumberOrNull = (value: string | undefined | null) => {
        if (!value || value.trim() === '') return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      };
      
      // Create dimensions object from individual fields
      const dimensions: any = {
        unit: "cm"
      };
      const length = toNumberOrNull(form.length);
      const width = toNumberOrNull(form.width);
      const height = toNumberOrNull(form.height);
      
      if (length !== null) dimensions.length = length;
      if (width !== null) dimensions.width = width;
      if (height !== null) dimensions.height = height;
      
      // Create payload with comprehensive null handling
      const payload = {
        name: toNullIfEmpty(form.name),
        category_id: toNullIfEmpty(form.category_id),
        type_id: toNullIfEmpty(form.type_id),
        brand_id: toNullIfEmpty(form.brand_id),
        model_id: toNullIfEmpty(form.model_id),
        description: toNullIfEmpty(form.description),
        weight: toNumberOrNull(form.weight),
        dimensions: (length !== null || width !== null || height !== null) ? JSON.stringify(dimensions) : null,
        fragile: form.fragile || false,
        needs_disassembly: form.needs_disassembly || false,
        icon: toNullIfEmpty(form.icon),
        color: toNullIfEmpty(form.color),
        tab_color: toNullIfEmpty(form.tab_color),
        image: toNullIfEmpty(form.image),
      };


      if(payload.category_id === null){
        showMessage("Please select a category for the item", 'error')
        return
      }
      
      if(payload.weight === null || payload.dimensions === null){
        errors.weight = "weight and dimensions cannot be empty"
        showMessage("weights and dimesions cannot be empty", 'error')
        return
      }



    


      
      if (editing?.id) await updateCommonItem(editing.id, payload);
      else             await createCommonItem(payload);
      await loadAll();
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save item:', error);
      console.error('failed ....', renderErrorMessage(error))
      console.log("the validation errors", validationErrors)
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      await deleteCommonItem(id);
      setItems(items.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  }

  // Calculate category counts
  const getCategoryCounts = () => {
    const counts: Record<string, number> = {
      all: items.length,
    };
    cats.forEach(cat => {
      counts[cat.id] = items.filter(item => item.category?.id === cat.id).length;
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts();

  const filtered = items.filter(i =>
    (!categoryFilter || i.category?.id === categoryFilter) &&
    (!typeFilter     || i.type?.id     === typeFilter) &&
    (!brandFilter    || i.brand?.id    === brandFilter) &&
    (!modelFilter    || i.model?.id    === modelFilter)
  );


  const columns: ColumnDefinition[] = [
    { 
      accessor: 'name', 
      title: 'Name',
      sortable: true,
      width: '15%'
    },
    { 
      accessor: 'category.name', 
      title: 'Category',
      sortable: true,
      width: '13%',
      render: (item: CommonItem) => item.category?.name || '-'
    },
    { 
      accessor: 'type.name', 
      title: 'Type',
      sortable: true,
      width: '13%',
      render: (item: CommonItem) => item.type?.name || '-'
    },
    { 
      accessor: 'brand.name', 
      title: 'Brand',
      sortable: true,
      width: '13%',
      render: (item: CommonItem) => item.brand?.name || '-'
    },
    { 
      accessor: 'model.name', 
      title: 'Model',
      sortable: true,
      width: '13%',
      render: (item: CommonItem) => item.model?.name || '-'
    },
    { 
      accessor: 'weight', 
      title: 'Weight (kg)',
      sortable: true,
      width: '10%',
      render: (item: CommonItem) => item.weight ? `${item.weight}` : '-'
    },
    { 
      accessor: 'dimensions', 
      title: 'Dimensions',
      width: '10%',
      render: (item: CommonItem) => {
        if (!item.dimensions) return '-';
        try {
          // Handle string format like "L: 227.8 × W: 119.6 × H: 86.5"
          if (typeof item.dimensions === 'string') {
            // Check if it's already a formatted string
            if (item.dimensions.includes('L:') && item.dimensions.includes('×')) {
              return item.dimensions;
            }
            // Try to parse as JSON
            const dims = JSON.parse(item.dimensions);
            const unit = dims.unit || 'cm';
            return `${dims.length || dims.L || 0} × ${dims.width || dims.W || 0} × ${dims.height || dims.H || 0} ${unit}`;
          }
          // Handle object format
          const dims = item.dimensions;
          const unit = dims.unit || 'cm';
          return `${dims.length || dims.L || 0} × ${dims.width || dims.W || 0} × ${dims.height || dims.H || 0} ${unit}`;
        } catch {
          return '-';
        }
      }
    },
    { 
      accessor: 'fragile', 
      title: 'Fragile',
      width: '8%',
      textAlign: 'center',
      render: (item: CommonItem) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          item.fragile 
            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {item.fragile ? 'Yes' : 'No'}
        </span>
      )
    },
    { 
      accessor: 'needs_disassembly', 
      title: 'Disassembly',
      width: '10%',
      textAlign: 'center',
      render: (item: CommonItem) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          item.needs_disassembly 
            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' 
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
        }`}>
          {item.needs_disassembly ? 'Yes' : 'No'}
        </span>
      )
    },
    { 
      accessor: 'image', 
      title: 'Image',
      width: '8%',
      textAlign: 'center',
      render: (item: CommonItem) => item.image ? (
        <img src={item.image} className="w-8 h-8 rounded object-cover" alt={item.name} />
      ) : (
        <span className="text-gray-400 dark:text-gray-500">-</span>
      )
    },
    {
      accessor: 'actions',
      title: 'Actions',
      width: '12%',
      textAlign: 'center',
      render: (item: CommonItem) => (
        <div className="flex gap-2 justify-center">
          <button 
            className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" 
            onClick={() => openForm(item)}
            title="Edit Item"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
            onClick={() => handleDelete(item.id)}
            title="Delete Item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }
  ];

  // Get category icon based on category name
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('furniture') || name.includes('chair') || name.includes('table')) return Package;
    if (name.includes('electronics') || name.includes('computer') || name.includes('phone')) return Box;
    if (name.includes('appliance') || name.includes('kitchen') || name.includes('home')) return Home;
    return Archive;
  };

  return (
    <>
      {/* Category Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 mb-6">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex space-x-1 rounded-t-2xl bg-gray-50 dark:bg-gray-700 p-1 overflow-x-auto">
            <Tab
              className={({ selected }) =>
                `w-full rounded-xl py-3 px-4 text-sm font-medium transition-all duration-200 ${
                  selected
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`
              }
              onClick={() => {
                setCategoryFilter('');
                setTypeFilter('');
                setBrandFilter('');
                setModelFilter('');
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Package className="w-4 h-4" />
                All Items
                <span className={`ml-1 py-0.5 px-2 rounded-full text-xs font-semibold ${
                  selectedTab === 0
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}>
                  {categoryCounts.all}
                </span>
              </div>
            </Tab>
            {cats.map((category, index) => {
              const IconComponent = getCategoryIcon(category.name);
              return (
                <Tab
                  key={category.id}
                  className={({ selected }) =>
                    `w-full rounded-xl py-3 px-4 text-sm font-medium transition-all duration-200 ${
                      selected
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                    }`
                  }
                  onClick={() => {
                    setCategoryFilter(category.id);
                    setTypeFilter('');
                    setBrandFilter('');
                    setModelFilter('');
                    loadTypes(category.id);
                    loadBrands(category.id);
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <IconComponent className="w-4 h-4" />
                    {category.name}
                    <span className={`ml-1 py-0.5 px-2 rounded-full text-xs font-semibold ${
                      selectedTab === index + 1
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                    }`}>
                      {categoryCounts[category.id] || 0}
                    </span>
                  </div>
                </Tab>
              );
            })}
          </Tab.List>
        </Tab.Group>
      </div>

      <DraggableDataTable
        data={filtered}
        columns={columns}
        loading={loading}
        title="Common Items"
        exportFileName="common-items"
        storeKey="items-table"
        onRefreshData={loadAll}
        actionButtons={
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={() => openForm()}
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        }
        extraFilters={
          <div className="flex gap-2">
            <FilterSelect
              options={cats.map(c => ({ value: c.id, label: c.name }))}
              value={categoryFilter}
              placeholder="All Categories"
              onChange={val => {
                setCategoryFilter(val ? String(val) : '');
                setTypeFilter('');
                setBrandFilter('');
                setModelFilter('');
                loadTypes(val ? String(val) : '');
                loadBrands(val ? String(val) : '');
              }}
            />
            <FilterSelect
              options={types.map(t => ({ value: t.id, label: t.name }))}
              value={typeFilter}
              placeholder="All Types"
              onChange={val => {
                setTypeFilter(val ? String(val) : '');
                setBrandFilter('');
                setModelFilter('');
                // Optionally, you could filter brands by type if needed
              }}
            />
            <FilterSelect
              options={brands.map(b => ({ value: b.id, label: b.name }))}
              value={brandFilter}
              placeholder="All Brands"
              onChange={val => {
                setBrandFilter(val ? String(val) : '');
                setModelFilter('');
                loadModels(val ? String(val) : '');
              }}
            />
            <FilterSelect
              options={models.map(m => ({ value: m.id, label: m.name }))}
              value={modelFilter}
              placeholder="All Models"
              onChange={val => setModelFilter(val ? String(val) : '')}
            />
          </div>
        }
        quickCheckFields={['id', 'name', 'category.name', 'type.name', 'brand.name', 'model.name']}
      />

      {/* Headless UI Modal */}
      <Transition appear show={modalOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setModalOpen(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-700">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white">
                      {editing ? 'Edit Item' : 'Add Item'}
                    </Dialog.Title>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Basic Information Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                          <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter item name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                          <FilterSelect
                            options={cats.map(c => ({ value: c.id, label: c.name }))}
                            value={form.category_id}
                            placeholder="Select category"
                            onChange={val => {
                              setForm({ ...form, category_id: val ? String(val) : '', type_id: '', brand_id: '', model_id: '' });
                              loadTypes(val ? String(val) : '');
                              loadBrands(val ? String(val) : '');
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label>
                          <FilterSelect
                            options={types.map(t => ({ value: t.id, label: t.name }))}
                            value={form.type_id}
                            placeholder="Select type"
                            onChange={val => setForm({ ...form, type_id: val ? String(val) : '' })}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Brand & Model</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Brand *</label>
                          <FilterSelect
                            options={brands.map(b => ({ value: b.id, label: b.name }))}
                            value={form.brand_id}
                            placeholder="Select brand"
                            onChange={val => {
                              setForm({ ...form, brand_id: val ? String(val) : '', model_id: '' });
                              loadModels(val ? String(val) : '');
                            }}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model *</label>
                          <FilterSelect
                            options={models.map(m => ({ value: m.id, label: m.name }))}
                            value={form.model_id}
                            placeholder="Select model"
                            onChange={val => setForm({ ...form, model_id: val ? String(val) : '' })}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                      <textarea
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        rows={3}
                        placeholder="Enter item description"
                      />
                    </div>

                    {/* Physical Properties Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Physical Properties</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Weight (kg)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.weight}
                            onChange={e => setForm({ ...form, weight: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Length (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={form.length}
                            onChange={e => setForm({ ...form, length: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="0.0"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Width (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={form.width}
                            onChange={e => setForm({ ...form, width: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="0.0"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Height (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={form.height}
                            onChange={e => setForm({ ...form, height: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Special Properties Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Special Properties</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="fragile"
                            checked={form.fragile}
                            onChange={e => setForm({ ...form, fragile: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <label htmlFor="fragile" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Fragile Item
                          </label>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="needs_disassembly"
                            checked={form.needs_disassembly}
                            onChange={e => setForm({ ...form, needs_disassembly: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <label htmlFor="needs_disassembly" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Needs Disassembly
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Visual Properties Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visual Properties</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon (FontAwesome)</label>
                          <input
                            type="text"
                            value={form.icon}
                            onChange={e => setForm({ ...form, icon: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="box, cube, package"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                          <input
                            type="text"
                            value={form.color}
                            onChange={e => setForm({ ...form, color: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="#3B82F6"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tab Color</label>
                          <input
                            type="text"
                            value={form.tab_color}
                            onChange={e => setForm({ ...form, tab_color: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="#1E40AF"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image URL</label>
                          <input
                            type="url"
                            value={form.image}
                            onChange={e => setForm({ ...form, image: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center gap-2 ${
                        saving 
                          ? 'bg-blue-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {saving && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {saving 
                        ? (editing ? 'Updating...' : 'Creating...') 
                        : (editing ? 'Update Item' : 'Create Item')
                      }
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ItemsTab; 