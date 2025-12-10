import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faCamera, faExclamationTriangle, faTools, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface Item {
    id: string;
    name: string;
    quantity: number;
    dimensions?: string;
    weight?: string;
    photos?: string[];
    special_instructions?: string;
    needs_disassembly?: boolean;
    fragile?: boolean;
}

interface ItemsTableProps {
    items: Item[];
    totalVolume?: string;
}

const ItemsTable: React.FC<ItemsTableProps> = ({ items, totalVolume }) => {
    return (
        <div>
            <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                                    Item
                                </th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Qty
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Dimensions
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Weight
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Photos
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fragile
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Needs Disassembly
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Special Requirements
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items?.map((item, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white">
                                        <div className="flex items-center">
                                            <FontAwesomeIcon icon={faBox} className="text-gray-400 mr-2" />
                                            <span className="text-sm font-medium text-gray-900">{item?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <span className="text-sm text-gray-700">{item?.quantity}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="text-sm text-gray-700">
                                    {(() => {
                                        const dims = item?.dimensions;
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
                                    })()}
                                </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="text-sm text-gray-700">{item?.weight}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-2">
                                            {item?.photos && item?.photos?.length > 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    <FontAwesomeIcon icon={faCamera} className="mr-1" />
                                                    {item.photos.length} photos
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {item?.fragile && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                                                Fragile
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {item?.needs_disassembly && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                <FontAwesomeIcon icon={faTools} className="mr-1" />
                                                Needs Disassembly
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {item?.special_instructions && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                                                {item.special_instructions}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Section */}
            <div className="mt-4 bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Total Items</p>
                        <p className="text-lg font-medium">{items?.reduce((acc, item) => acc + (item?.quantity || 0), 0)} items</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Total Volume</p>
                        <p className="text-lg font-medium">{totalVolume || 'Calculating...'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Fragile Items</p>
                        <p className="text-lg font-medium">{items?.filter((item) => item?.fragile).length || 0} items</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Items Needing Disassembly</p>
                        <p className="text-lg font-medium">{items?.filter((item) => item?.needs_disassembly).length || 0} items</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemsTable;
