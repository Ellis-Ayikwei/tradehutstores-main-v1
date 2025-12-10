import { faCheckCircle, faComments, faPhone, faUser, faUserMinus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { mutate } from 'swr';
import axiosInstance from '../../services/axiosInstance';
import confirmDialog from '../../helper/confirmDialog';
import showMessage from '../../helper/showMessage';
import { Job } from '../../types/job';

interface ProviderProfileBoxProps {
    job: Job;
    onTabChange: (tab: string) => void;
    onNavigate: (path: string) => void;
    onRefresh: () => void;
}

const ProviderProfileBox: React.FC<ProviderProfileBoxProps> = ({ job, onTabChange, onNavigate, onRefresh }) => {
    const handleUnassignProvider = async () => {
        console.log('unassign clicked');
        const isConfirmed = await confirmDialog({
            title: 'Unassign Provider',
            body: 'Are you sure you want to unassign this provider from the job?',
            finalQuestion: 'Are you sure you want to unassign this provider from the job?',
        });

        if (isConfirmed) {
            try {
                await axiosInstance.post(`/jobs/${job.id}/unassign_provider/`);
                showMessage('success', 'Provider unassigned successfully!');
                mutate(`/jobs/${job.id}/`);
            } catch (error) {
                console.error('Error unassigning provider:', error);
                showMessage('error', 'Failed to unassign provider');
            }
        }
    };

    const handleCallProvider = () => {
        // You can implement actual phone call functionality here
        showMessage('info', 'Phone call feature would be implemented here');
    };

    const handleSendMessage = () => {
        // Navigate to chat tab
        onTabChange('chat');
    };

    const handleViewProfile = () => {
        // Navigate to provider profile
        onNavigate(`/admin/providers/${job?.assigned_provider?.id}`);
    };

    return (
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 l shadow-xl border border-white/20 dark:border-slate-700/30 overflow-hidden">
            <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Assigned Provider
                </h2>

                <div className="space-y-4">
                    {/* Provider Info */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            {job?.assigned_provider?.company_name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{job?.assigned_provider?.company_name || 'Provider Name'}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <FontAwesomeIcon
                                            key={i}
                                            icon={faCheckCircle}
                                            className={`w-3 h-3 ${i < (job?.assigned_provider?.rating || 0) ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">{job.assigned_provider.rating?.toFixed(1) || '0.0'} Rating</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-bold">ASSIGNED</span>
                                <span className="text-slate-600 dark:text-slate-400 text-xs">ID: {job?.assigned_provider?.id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Contact Actions */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Contact Provider</h4>

                        <div className="grid grid-cols-1 gap-2">
                            {/* Phone Call */}
                            <button
                                onClick={handleCallProvider}
                                className="w-full px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                                         text-white font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 shadow-md shadow-green-500/25 hover:shadow-lg hover:shadow-green-500/30 
                                         hover:scale-102 border border-green-400/50 text-sm"
                            >
                                <FontAwesomeIcon icon={faPhone} className="text-sm" />
                                Call Provider
                            </button>

                            {/* Direct Message */}
                            <button
                                onClick={handleSendMessage}
                                className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                                         text-white font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 
                                         hover:scale-102 border border-blue-400/50 text-sm"
                            >
                                <FontAwesomeIcon icon={faComments} className="text-sm" />
                                Send Message
                            </button>

                            {/* View Provider Profile */}
                            <button
                                onClick={handleViewProfile}
                                className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                                         text-white font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/30 
                                         hover:scale-102 border border-purple-400/50 text-sm"
                            >
                                <FontAwesomeIcon icon={faUser} className="text-sm" />
                                View Profile
                            </button>

                            {/* Unassign Provider */}
                            <button
                                onClick={() => handleUnassignProvider()}
                                className="w-full px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                                         text-white font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/30 
                                         hover:scale-102 border border-red-400/50 text-sm"
                            >
                                <FontAwesomeIcon icon={faUserMinus} className="text-sm" />
                                Unassign Provider
                            </button>
                        </div>
                    </div>

                    {/* Provider Status */}
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-200/30 dark:border-blue-700/30">
                        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 text-sm">Provider Status</h4>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Job Status:</span>
                                <span className="font-semibold text-slate-900 dark:text-white capitalize">{job.status.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Assignment Date:</span>
                                <span className="font-semibold text-slate-900 dark:text-white">{new Date(job.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Provider Rating:</span>
                                <span className="font-semibold text-slate-900 dark:text-white">{job.assigned_provider.rating?.toFixed(1) || 'N/A'} / 5.0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProviderProfileBox;
