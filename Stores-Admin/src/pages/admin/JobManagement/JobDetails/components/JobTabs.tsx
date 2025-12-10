import React from 'react';
import { Job } from '../../../../../types/job';
import JobDetailsTab from './JobDetailsTab';
import JobItemsTab from './JobItemsTab';
import JobRouteTab from './JobRouteTab';
import TimelineTab from '../../../../../components/Provider/JobDetailTabs/TimelineTab';
import DocumentsTab from '../../../../../components/Provider/JobDetailTabs/DocumentsTab';
import ChatTab from '../../../../../components/Provider/JobDetailTabs/ChatTab';

interface JobTabsProps {
    job: Job;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onSendMessage: (message: string, attachments?: File[]) => Promise<void>;
}

const JobTabs: React.FC<JobTabsProps> = ({ job, activeTab, setActiveTab, onSendMessage }) => {
    const tabs = [
        { id: 'details', label: 'Details' },
        { id: 'route', label: 'Route' },
        { id: 'items', label: 'Items' },
        { id: 'timeline', label: 'Timeline' },
        { id: 'documents', label: 'Documents' },
        { id: 'chat', label: 'Chat' },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'details':
                return <JobDetailsTab job={job} />;
            case 'route':
                return <JobRouteTab job={job} />;
            case 'items':
                return <JobItemsTab job={job} />;
            case 'timeline':
                return <TimelineTab job={job} userType="admin" />;
            case 'documents':
                return <DocumentsTab job={job} />;
            case 'chat':
                return <ChatTab job={job} onSendMessage={onSendMessage} />;
            default:
                return <JobDetailsTab job={job} />;
        }
    };

    return (
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/30 overflow-hidden">
            <div className="border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                <nav className="flex -mb-px overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-4 text-lg font-semibold whitespace-nowrap transition-all duration-200 ${
                                activeTab === tab.id
                                    ? 'border-b-4 border-orange-500 text-orange-600 dark:text-orange-400 bg-white/50 dark:bg-slate-700/50'
                                    : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-700/30'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content */}
            <div className="p-8">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default JobTabs; 