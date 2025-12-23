import { MapPin, Map, StickyNote } from 'lucide-react';
import React from 'react';
import { Job } from '../../../../../types/job';

interface JobRouteTabProps {
    job: Job;
}

const JobRouteTab: React.FC<JobRouteTabProps> = ({ job }) => {
    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
                Route Information
            </h3>

            <div className="space-y-4">
                {job.request?.all_locations && job.request.all_locations.length > 0 ? (
                    job.request.all_locations.map((location, index) => (
                        <div
                            key={location.id || index}
                            className="backdrop-blur-sm bg-slate-50/80 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50"
                        >
                            <div className="flex items-start gap-4">
                                <div
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold ${
                                        location.type === 'pickup' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-green-500 to-green-600'
                                    }`}
                                >
                                    {index + 1}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                location.type === 'pickup'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            }`}
                                        >
                                            {location.type === 'pickup' ? 'PICKUP' : 'DELIVERY'}
                                        </span>
                                        <span className="text-slate-600 dark:text-slate-400 text-sm">Location {index + 1}</span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-1" />
                                            <div>
                                                <p className="text-slate-900 dark:text-white font-semibold">{location.address}</p>
                                                {location.postcode && <p className="text-slate-600 dark:text-slate-400 text-sm">{location.postcode}</p>}
                                            </div>
                                        </div>

                                        {location.notes && (
                                            <div className="flex items-start gap-3 mt-3">
                                                <StickyNote className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-1" />
                                                <p className="text-slate-700 dark:text-slate-300 text-sm">{location.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <div className="backdrop-blur-xl bg-slate-50/80 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-700/30 max-w-md mx-auto">
                            <div className="w-16 h-16 bg-slate-200/80 dark:bg-slate-700/80 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <Map className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Route Information</h3>
                            <p className="text-slate-600 dark:text-slate-400">Route details have not been added yet.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobRouteTab; 