import React from 'react';
import { Job } from '../../../../../types/job';

interface JobMetricsProps {
    job: Job;
}

const JobMetrics: React.FC<JobMetricsProps> = ({ job }) => {
    const calculateTotalVolume = () => {
        const totalVolume = (job?.request?.moving_items || []).reduce((sum, item) => {
            const dims = item?.dimensions;
            if (!dims) return sum;
            
            if (typeof dims === 'string') {
                const match = dims.match(/(\d+)x(\d+)x(\d+)/);
                if (match) {
                    const [_, l, w, h] = match;
                    const volume = parseInt(l) * parseInt(w) * parseInt(h) * (item.quantity || 1);
                    return sum + volume;
                }
            } else if (typeof dims === 'object' && dims !== null) {
                const { width, height, length } = dims as any;
                if (width && height && length) {
                    const volume = parseFloat(width) * parseFloat(height) * parseFloat(length) * (item.quantity || 1);
                    return sum + volume;
                }
            }
            return sum;
        }, 0);
        return totalVolume > 0 ? `${Math.round(totalVolume / 1000)}k` : 'N/A';
    };

    return (
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
            {/* Bottom Row - Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {/* Total Weight */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-lg font-bold text-black dark:text-white mb-1">
                            {(job.request?.moving_items || []).reduce((sum, item) => {
                                const weight = typeof item.weight === 'string' ? parseFloat(item.weight) || 0 : item.weight || 0;
                                return sum + weight;
                            }, 0)}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Weight (kg)</div>
                    </div>
                </div>

                {/* Item Count */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-lg font-bold text-black dark:text-white mb-1">{(job.request?.moving_items || []).length}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Items</div>
                    </div>
                </div>

                {/* Distance */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-lg font-bold text-black dark:text-white mb-1">{job.request?.estimated_distance || 0}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Distance (km)</div>
                    </div>
                </div>

                {/* Base Price */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-lg font-bold text-black dark:text-white mb-1">£ {job.request?.base_price || 0}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Price (£)</div>
                    </div>
                </div>

                {/* Total Dimensions */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-lg font-bold text-black dark:text-white mb-1">
                           {job.request?.volume || 0} Cubic Meters
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Volume (m³)</div>
                    </div>
                </div>

                {/* Insurance Value */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-lg font-bold text-black dark:text-white mb-1">
                            £
                            {(job.request?.moving_items || [])
                                .reduce((sum, item) => {
                                    return sum + (item.declared_value || 0);
                                }, 0)
                                .toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Insurance Value</div>
                    </div>
                </div>
            </div>

            {/* Additional Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {/* Fragile Items */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-2 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-base font-bold text-black dark:text-white mb-1">{(job.request?.items || []).filter((item) => item.fragile).length}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Fragile Items</div>
                    </div>
                </div>

                {/* Disassembly Required */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-2 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-base font-bold text-black dark:text-white mb-1">{(job.request?.items || []).filter((item) => item.needs_disassembly).length}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Disassembly</div>
                    </div>
                </div>

                {/* Insurance Required */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-2 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-base font-bold text-black dark:text-white mb-1">{job.request?.insurance_required ? 'Yes' : 'No'}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Insurance</div>
                    </div>
                </div>

                {/* Priority */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-2 border border-slate-200/50 dark:border-slate-600/50">
                    <div className="text-center">
                        <div className="text-base font-bold text-black dark:text-white mb-1">{job.request?.service_level?.toUpperCase() || 'NORMAL'}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Priority</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobMetrics; 