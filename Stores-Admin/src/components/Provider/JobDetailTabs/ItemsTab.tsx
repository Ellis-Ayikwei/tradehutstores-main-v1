import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faWeightHanging, faExclamationTriangle, faTools } from '@fortawesome/free-solid-svg-icons';
import { Job } from '../../../types/job';

interface ItemsTabProps {
    job: Job;
}

const ItemsTab: React.FC<ItemsTabProps> = ({ job }) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Group items by category
    const itemsByCategory = job.request.moving_items.reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, typeof job.request.moving_items>);

    const categories = Object.keys(itemsByCategory);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Moving Items</h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Items: {job.request.moving_items.length}</div>
                </div>

                {/* Category filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedCategory === null
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        All Items
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                                selectedCategory === category
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Items list */}
                <div className="space-y-4">
                    {job.request.moving_items
                        .filter((item) => !selectedCategory || item.category === selectedCategory)
                        .map((item, index) => (
                            <div key={item.id || index} className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start space-x-4">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                            {item.photo ? (
                                                <img src={item.photo} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <FontAwesomeIcon icon={faBox} className="text-gray-500 dark:text-gray-400 text-xl" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {item.quantity} {item.quantity > 1 ? 'items' : 'item'}
                                        </div>
                                        {item.weight && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end mt-1">
                                                <FontAwesomeIcon icon={faWeightHanging} className="mr-1.5 text-gray-400 dark:text-gray-500" />
                                                {item.weight}kg
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Special flags */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {item.fragile && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                                            Fragile
                                        </span>
                                    )}
                                    {item.needs_disassembly && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                                            <FontAwesomeIcon icon={faTools} className="mr-1" />
                                            Needs Disassembly
                                        </span>
                                    )}
                                    {item.declared_value && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                            Declared Value: ${item.declared_value}
                                        </span>
                                    )}
                                </div>

                                {/* Notes */}
                                {item.notes && (
                                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                        <strong>Notes:</strong> {item.notes}
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default ItemsTab;
