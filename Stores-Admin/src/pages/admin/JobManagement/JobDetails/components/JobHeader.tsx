import { ArrowLeft, Edit, RefreshCcw, Trash2, UserPlus } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Job } from '../../../../../types/job';

interface JobHeaderProps {
    job: Job;
    onDeleteJob: (jobId: string) => void;
    onAssignProvider: (job: Job) => void;
    getStatusBadgeClass: (status: string) => string;
    getStatusIcon: (status: string) => React.ReactNode;
    mutateJob: () => void;
}

const JobHeader: React.FC<JobHeaderProps> = ({
    job,
    onDeleteJob,
    onAssignProvider,
    getStatusBadgeClass,
    getStatusIcon,
    mutateJob,
	}) => {
    const navigate = useNavigate();

    return (
        <div className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border-b border-white/20 dark:border-slate-700/30">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Top Row - Job Info and Actions */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => navigate('/admin/jobs')}
                            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100/80 dark:bg-slate-700/80 
                                     text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 
                                     hover:bg-white dark:hover:bg-slate-600 transition-all duration-200 backdrop-blur-sm
                                     border border-slate-200/50 dark:border-slate-600/50 hover:border-orange-300 dark:hover:border-orange-600"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Job #{job?.request?.tracking_number || job.id}</h1>
                            <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">{job.request?.service_type || 'Service Request'}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Status Badge */}
                        <span className={`flex items-center px-2 py-1 rounded-2xl  font-bold backdrop-blur-sm border-2 ${getStatusBadgeClass(job.status)}`}>
                            {getStatusIcon(job.status)}
                            <span className="ml-2">{(job?.status || 'unknown').replace(/_/g, ' ')}</span>
                        </span>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                            
                            <button
                                onClick={() => onAssignProvider(job)}
                                className="btn btn-outline-success rounded-full bg-green-50"
                                title="Assign Provider"
                            >
                                <UserPlus className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDeleteJob(job.id)}
                                className="btn btn-outline-danger rounded-full bg-danger-50"
                                title="Delete Job"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => mutateJob()}
                                className="btn btn-outline-primary rounded-full bg-primary-50"
                                title="Refresh Job"
                            >
                                <RefreshCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobHeader; 