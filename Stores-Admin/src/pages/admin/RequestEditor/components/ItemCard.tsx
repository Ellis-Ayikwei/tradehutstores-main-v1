import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface ItemCardProps {
  item: any;
  quantity: number;
  isExpanded: boolean;
  selectedItem?: any;
  onQuantityUpdate: (itemId: string, change: number, item: any, category: any) => void;
  onRemoveItem: (itemId: string) => void;
  onToggleExpansion: (itemId: string) => void;
  onUpdateSelectedItem: (itemId: string, field: string, value: any) => void;
  category?: any;
}

const ItemCard: React.FC<ItemCardProps> = ({
  item,
  quantity,
  isExpanded,
  selectedItem,
  onQuantityUpdate,
  onRemoveItem,
  onToggleExpansion,
  onUpdateSelectedItem,
  category
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h5 className="font-bold text-lg text-gray-900 mb-2">
            {item.name}
          </h5>
          {item.description && (
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              {item.description}
            </p>
          )}
          <div className="space-y-1">
            {item.dimensions && (
              <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block">
                {typeof item.dimensions === 'string' 
                  ? item.dimensions 
                  : `${item.dimensions.width || 0} × ${item.dimensions.height || 0} × ${item.dimensions.length || 0} ${item.dimensions.unit || 'cm'}`
                }
              </p>
            )}
            {item.weight && (
              <p className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block ml-2">
                {item.weight}kg
              </p>
            )}
          </div>
        </div>
        
        {/* Expand and Delete buttons */}
        {quantity > 0 && (
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => onToggleExpansion(item.id)}
              className="w-8 h-8 rounded bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors duration-200"
              title="Edit item details"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onRemoveItem(item.id)}
              className="w-8 h-8 rounded bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors duration-200"
              title="Remove item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onQuantityUpdate(item.id, -1, item, category)}
            disabled={quantity === 0}
            className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 flex items-center justify-center transition-colors duration-200"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          
          <span className="w-10 text-center font-semibold text-lg text-gray-900 bg-gray-50 px-2 py-1 rounded">
            {quantity}
          </span>
          
          <button
            onClick={() => onQuantityUpdate(item.id, 1, item, category)}
            className="w-8 h-8 rounded bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Edit Section */}
      {quantity > 0 && isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={selectedItem?.name || item.name}
                  onChange={(e) => onUpdateSelectedItem(item.id, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                <input
                  type="text"
                  value={selectedItem?.weight || (item.weight ? parseFloat(item.weight.replace(/[^\d.-]/g, '')) || '' : '') || ''}
                  onChange={(e) => onUpdateSelectedItem(item.id, 'weight', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={item.weight || "Enter weight"}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
              <input
                type="text"
                value={selectedItem?.dimensions || item.dimensions || ''}
                onChange={(e) => onUpdateSelectedItem(item.id, 'dimensions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={typeof item.dimensions === 'string' ? item.dimensions : "e.g., 100 x 50 x 30 cm"}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={selectedItem?.notes || ''}
                onChange={(e) => onUpdateSelectedItem(item.id, 'notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
                placeholder="Any special instructions or notes..."
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ItemCard;
