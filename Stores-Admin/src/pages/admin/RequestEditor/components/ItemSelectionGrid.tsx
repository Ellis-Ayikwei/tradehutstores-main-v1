import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Minus, ChevronDown, ChevronUp, Trash2, Home, Building, School, Car } from 'lucide-react';
import useSWR from 'swr';
import fetcher from '../../../../services/fetcher';
import { parseDimensions, formatDimensionsToAPI, formatDimensionsToDisplay, getItemDimensions, ParsedDimensions } from '../../../../utils/dimensionUtils';

interface ItemSelectionGridProps {
  requestData: any;
  displayCategories: any[];
  categoriesLoading: boolean;
  isEditing: boolean;
  onDeleteItem?: (itemId: string) => void;
  deletingItems?: {[key: string]: boolean};
  onSelectionCountChange?: (count: number) => void;
  onItemQuantityChange?: (args: { item: any; categoryId: string; quantity: number }) => void;
  onItemFieldChange?: (args: { itemId: string; field: string; value: any }) => void;
  selectedMap?: { [id: string]: any };
}

const ItemSelectionGrid: React.FC<ItemSelectionGridProps> = ({
  requestData,
  displayCategories,
  categoriesLoading,
  isEditing,
  onDeleteItem = () => {},
  deletingItems = {},
  onSelectionCountChange = () => {},
  onItemQuantityChange = () => {},
  onItemFieldChange = () => {},
  selectedMap = {}
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [itemQuantities, setItemQuantities] = useState<{[key: string]: number}>({});
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [initializedForCategory, setInitializedForCategory] = useState<Set<string>>(new Set());

  // Fetch items for selected category
  const { data: items, isLoading: itemsLoading } = useSWR(
    selectedCategory ? `/common-items/?category_id=${selectedCategory}` : null,
    fetcher
  );

  const getCategoryIcon = (categoryName: string) => {
    const iconMap: { [key: string]: any } = {
      'Living Room': Home,
      'Bedroom': Home,
      'Kitchen': Home,
      'Bathroom': Home,
      'Office': Building,
      'Student': School,
      'Furniture': Home,
      'Appliances': Home,
      'Electronics': Building,
      'Garden': Car,
      'Other': Package
    };
    return iconMap[categoryName] || Package;
  };

  const updateQuantity = (item: any, change: number) => {
    const itemId = item.id;
    const fromSelected = selectedMap[itemId]?.quantity;
    const baseQuantity = fromSelected ?? itemQuantities[itemId] ?? 0;
    const newQuantity = Math.max(0, baseQuantity + change);
    
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }));
    const next = { ...itemQuantities, [itemId]: newQuantity } as {[key: string]: number};
    const total = Object.values(next).reduce((sum, q) => sum + (q || 0), 0);
    onSelectionCountChange(total);
    onItemQuantityChange({ item, categoryId: selectedCategory, quantity: newQuantity });
  };

  const toggleExpansion = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const updateItemField = (itemId: string, field: string, value: any) => {
    onItemFieldChange({ itemId, field, value });
  };

  // Initialize quantities from existing request items when category is selected
  useEffect(() => {
    if (!isEditing || !selectedCategory || !items || initializedForCategory.has(selectedCategory)) return;
    const existing = Array.isArray(requestData?.items) ? requestData.items : [];
    const next: {[key: string]: number} = { ...itemQuantities };
    let changed = false;
    items.forEach((commonItem: any) => {
      // Match by category and name
      const match = existing.find((ri: any) => (
        (ri?.category_id === selectedCategory || ri?.category?.id === selectedCategory) &&
        (ri?.name || '').trim().toLowerCase() === (commonItem?.name || '').trim().toLowerCase()
      ));
      if (match && (match.quantity || match.quantity === 0)) {
        next[commonItem.id] = match.quantity;
        changed = true;
        // Inform parent so Save can enable and diff can build
        onItemQuantityChange({ item: commonItem, categoryId: selectedCategory, quantity: match.quantity });
      }
    });
    if (changed) {
      setItemQuantities(next);
      const total = Object.values(next).reduce((sum, q) => sum + (q || 0), 0);
      onSelectionCountChange(total);
    }
    setInitializedForCategory(prev => new Set(prev).add(selectedCategory));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, selectedCategory, items]);

  // Keep total count in sync with external selectedMap changes
  useEffect(() => {
    const total = Object.values(selectedMap || {}).reduce((sum: number, it: any) => sum + (it?.quantity || 0), 0);
    onSelectionCountChange(total);
  }, [selectedMap]);

  const getTotalItems = () => {
    return Object.values(itemQuantities).reduce((sum, quantity) => sum + quantity, 0);
  };

  if (!isEditing) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">Select Item Category</h4>
        {categoriesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {displayCategories.map((category: any) => {
              const isSelected = selectedCategory === category.id;
              const IconComponent = getCategoryIcon(category.name);
              
              return (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  disabled={!isEditing}
                  className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    !isEditing 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300'
                  }`}
                  whileHover={isEditing ? { scale: 1.02 } : {}}
                  whileTap={isEditing ? { scale: 0.98 } : {}}
                >
                  <IconComponent className="w-5 h-5 mr-2" />
                  <span className="text-sm">{category.name}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Items Grid */}
      {selectedCategory && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">Select Items</h4>
            <div className="text-sm text-gray-600">
              Total Items: <span className="font-medium text-blue-600">{getTotalItems()}</span>
            </div>
          </div>
          
          {itemsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : items && items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item: any) => {
                const quantity = (selectedMap[item.id]?.quantity ?? itemQuantities[item.id] ?? 0);
                const isExpanded = expandedItems[item.id];
                const sel = selectedMap[item.id] || {};
                const weightVal = sel.weight ?? item.weight ?? '';
                const notesVal = sel.special_instructions ?? item.notes ?? '';
                
                // Get parsed dimensions for the item
                const getCurrentDimensions = (): ParsedDimensions => {
                  if (sel.parsedDimensions) {
                    return sel.parsedDimensions;
                  }
                  const dimsString = sel.dimensions ?? item.dimensions ?? '';
                  if (dimsString) {
                    return parseDimensions(dimsString);
                  }
                  return getItemDimensions(item);
                };
                
                const currentDims = getCurrentDimensions();
                
                return (
                  <motion.div
                    key={item.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 text-sm mb-1">{item.name}</h5>
                        <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.dimensions && (
                            <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block">
                              {formatDimensionsToDisplay(getItemDimensions(item))}
                            </p>
                          )}
                          {item.weight && (
                            <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block">
                              {parseFloat(item.weight.toString().replace(/[^\d.-]/g, '')) || item.weight}kg
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Quantity:</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item, -1)}
                          disabled={!isEditing || quantity === 0}
                          className="w-8 h-8 rounded flex items-center justify-center transition-colors duration-200 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(item, 1)}
                          disabled={!isEditing}
                          className="w-8 h-8 rounded flex items-center justify-center transition-colors duration-200 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {quantity > 0 && (
                      <div className="space-y-2">
                        <button
                          onClick={() => toggleExpansion(item.id)}
                          className="w-full flex items-center justify-between text-xs text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          <span>Item Details</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 pt-2 border-t border-gray-200"
                          >
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Weight (kg)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={weightVal}
                                onChange={(e) => updateItemField(item.id, 'weight', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter weight"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Dimensions</label>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Length</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={currentDims.length}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      const newDims = { ...currentDims, length: value };
                                      updateItemField(item.id, 'parsedDimensions', newDims);
                                      updateItemField(item.id, 'dimensions', formatDimensionsToAPI(newDims));
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Height</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={currentDims.height}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      const newDims = { ...currentDims, height: value };
                                      updateItemField(item.id, 'parsedDimensions', newDims);
                                      updateItemField(item.id, 'dimensions', formatDimensionsToAPI(newDims));
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Width</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={currentDims.width}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      const newDims = { ...currentDims, width: value };
                                      updateItemField(item.id, 'parsedDimensions', newDims);
                                      updateItemField(item.id, 'dimensions', formatDimensionsToAPI(newDims));
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                Format: {formatDimensionsToDisplay(currentDims)}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Notes</label>
                              <textarea
                                value={notesVal}
                                onChange={(e) => updateItemField(item.id, 'special_instructions', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Special instructions..."
                                rows={2}
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No items found in this category
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemSelectionGrid;