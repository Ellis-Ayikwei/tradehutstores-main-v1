import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { getItemIcon } from '../../utilities/getItemIcon';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';
import { v4 as uuidv4 } from 'uuid';

interface CommonItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectItem: (item: any) => void;
}

const CommonItemsModal: React.FC<CommonItemsModalProps> = ({ isOpen, onClose, onSelectItem }) => {
    if (!isOpen) return null;
    const { data: categories, isLoading } = useSWR('/item-categories/', fetcher);
    const { data: commonItems, isLoading: comLoading } = useSWR('/common-items/categories_with_items/', fetcher);

    useEffect(() => {
        if (commonItems) {
            console.log(commonItems);
            console.log('the cats ', categories);
        }
    }, [commonItems]);
    const scrollToPosition = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1050] overflow-y-auto" aria-labelledby="common-items-modal" role="dialog" aria-modal="true" onClick={onClose}>
            {/* Backdrop overlay */}

            {/* Modal container - centered */}
            <div className="flex items-center justify-center min-h-screen p-4">
                {/* Modal content */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full overflow-hidden transform transition-all" onClick={(e) => e.stopPropagation()}>
                    {/* Modal header */}
                    <div className="bg-gray-50 dark:bg-gray-750 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Quick Add Common Items</h3>
                        <button type="button" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" onClick={onClose}>
                            <span className="sr-only">Close</span>
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    {/* Modal body */}
                    <div className="p-6">
                        <div className="mb-4">
                            <div className="flex flex-wrap justify-center gap-3 p-4">
                                {/* Category buttons */}
                                {categories?.map((category, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            scrollToPosition(`${category.name}-section`);
                                        }}
                                        className={`${getItemIcon(category.name).tabColor} px-4 py-2 rounded-md text-sm flex items-center whitespace-nowrap`}
                                    >
                                        <FontAwesomeIcon icon={getItemIcon(category.name).icon} className="mr-2" />
                                        {category.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            {commonItems?.map((category) => (
                                <div key={category.name} id={`${category.name}-section`} className="mb-8">
                                    <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                                        <FontAwesomeIcon icon={getItemIcon(category.name).icon} className={`${getItemIcon(category.name).color} mr-2`} />
                                        {category.name}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {category?.items?.map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    onSelectItem({
                                                        id: uuidv4(),
                                                        name: item.name,
                                                        category: category.name.toLowerCase(),
                                                        category_id: category.id,
                                                        quantity: 1,
                                                        weight: item.weight || '',
                                                        dimensions: item.dimensions || '',
                                                        value: '',
                                                        fragile: item.fragile || false,
                                                        needs_disassembly: item.needs_disassembly || false,
                                                        notes: '',
                                                        photo: null,
                                                        pickup_stop: null,
                                                        dropoff_stop: null,
                                                    });
                                                }}
                                                className="flex items-center text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                                <div className={`w-8 h-8 rounded-full ${getItemIcon(category.name).color} flex items-center justify-center mr-3`}>
                                                    <FontAwesomeIcon icon={getItemIcon(category.name).icon} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-800 dark:text-gray-200">{item.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {(() => {
                                const dims = item.dimensions;
                                if (!dims) return 'N/A';
                                
                                if (typeof dims === 'string') {
                                    // Try to parse string format
                                    const match = dims.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
                                    if (match) {
                                        const [, width, height, length, unit] = match;
                                        const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                        return `${volume.toFixed(0)} cubic ${unit}`;
                                    }
                                    return dims;
                                }
                                
                                if (typeof dims === 'object') {
                                    const { unit, width, height, length } = dims as any;
                                    if (width && height && length) {
                                        const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                        return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
                                    }
                                }
                                
                                return 'N/A';
                            })()} • {item.weight} kg
                                                        {item.needs_disassembly && ' • Needs disassembly'}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Modal footer */}
                    <div className="bg-gray-50 dark:bg-gray-750 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-md text-sm"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CommonItemsModal;
