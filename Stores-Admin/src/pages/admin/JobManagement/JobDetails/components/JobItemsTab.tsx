import { Route } from 'lucide-react';
import React from 'react';
import { Job } from '../../../../../types/job';

interface JobItemsTabProps {
    job: Job;
}

const JobItemsTab: React.FC<JobItemsTabProps> = ({ job }) => {
    const formatDimensions = (dimensions: any) => {
        if (!dimensions) return 'N/A';
        
        if (typeof dimensions === 'string') {
            // Try to parse string format
            const match = dimensions.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
            if (match) {
                const [, width, height, length, unit] = match;
                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                return `${volume.toFixed(0)} cubic ${unit}`;
            }
            return dimensions;
        }
        
        if (typeof dimensions === 'object') {
            const { unit, width, height, length } = dimensions as any;
            if (width && height && length) {
                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
            }
        }
        
        return 'N/A';
    };

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
                Moving Items
            </h3>

            {job.request?.request_type !== 'journey' ? (
                <div className="space-y-4">
                    {(job.request?.moving_items || []).map((item, index) => (
                        <div
                            key={item.id || index}
                            className="backdrop-blur-sm bg-slate-50/80 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-sm font-bold">
                                            ITEM {index + 1}
                                        </span>
                                        {item.quantity && item.quantity > 1 && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-bold">
                                                Qty: {item.quantity}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">Name:</span>
                                                <p className="text-slate-900 dark:text-white font-semibold">{item.name || 'Unnamed Item'}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">Category:</span>
                                                <p className="text-slate-900 dark:text-white font-semibold">{item.category || 'General'}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">Weight:</span>
                                                <p className="text-slate-900 dark:text-white font-semibold">{item.weight || 'N/A'} kg</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">Dimensions:</span>
                                                <p className="text-slate-900 dark:text-white font-semibold">
                                                    {formatDimensions(item?.dimensions)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">Declared Value:</span>
                                                <p className="text-slate-900 dark:text-white font-semibold">£{item.declared_value || 0}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">Quantity:</span>
                                                <p className="text-slate-900 dark:text-white font-semibold">{item.quantity || 1}</p>
                                            </div>
                                        </div>

                                        {item.description && (
                                            <div>
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">Description:</span>
                                                <p className="text-slate-700 dark:text-slate-300 mt-1">{item.description}</p>
                                            </div>
                                        )}

                                        {(item.fragile || item.needs_disassembly) && (
                                            <div className="flex gap-2">
                                                {item.fragile && (
                                                    <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs rounded-full font-semibold">
                                                        FRAGILE
                                                    </span>
                                                )}
                                                {item.needs_disassembly && (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs rounded-full font-semibold">
                                                        DISASSEMBLY REQUIRED
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Journey type request - No moving items */
                <div className="text-center py-16">
                    <div className="backdrop-blur-xl bg-slate-50/80 dark:bg-slate-800/50 rounded-3xl p-12 border border-slate-200/50 dark:border-slate-700/30 max-w-md mx-auto">
                        <div className="w-20 h-20 bg-slate-200/80 dark:bg-slate-700/80 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Route className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Journey Type Request</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            This is a journey-type request focusing on route and transportation rather than specific items. Please check the Route tab for detailed
                            location information.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobItemsTab; 