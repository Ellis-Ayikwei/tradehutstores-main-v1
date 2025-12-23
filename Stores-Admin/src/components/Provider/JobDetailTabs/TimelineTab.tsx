import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClock,
    faCheckCircle,
    faExclamationCircle,
    faUser,
    faTruck,
    faFileAlt,
    faMoneyBillWave,
    faStar,
    faEdit,
    faUpload,
    faMessage,
    faShieldAlt,
    faBell,
    faEye,
    faEyeSlash,
    faCircle,
} from '@fortawesome/free-solid-svg-icons';
import { Job } from '../../../types/job';

interface TimelineTabProps {
    job: Job;
    userType: 'provider' | 'customer' | 'admin'; // Add admin to userType prop
}

const TimelineTab: React.FC<TimelineTabProps> = ({ job, userType }) => {
    // Helper function to safely format dates
    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return 'Pending';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleString();
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };

    // Define the process steps in order
    const processSteps = [
        { type: 'created', title: 'Job Created', icon: faClock },
        { type: 'provider_assigned', title: 'Provider Assigned', icon: faUser },
        { type: 'provider_accepted', title: 'Provider Accepted', icon: faCheckCircle },
        { type: 'job_started', title: 'Job Started', icon: faTruck },
        { type: 'in_transit', title: 'In Transit', icon: faTruck },
        { type: 'completed', title: 'Job Completed', icon: faCheckCircle },
        { type: 'payment_processed', title: 'Payment Processed', icon: faMoneyBillWave },
        { type: 'rating_submitted', title: 'Rating Submitted', icon: faStar },
    ];

    const getStepStatus = (stepType: string) => {
        // Find the most recent event of this type
        const event = job.timeline_events?.find((e) => e.event_type === stepType);
        if (!event) return 'pending';

        // Check if this step is completed
        if (stepType === 'created') return 'completed';
        if (stepType === 'provider_assigned' && job.status !== 'draft') return 'completed';
        if (stepType === 'provider_accepted' && ['accepted', 'assigned', 'in_transit', 'completed'].includes(job.status)) return 'completed';
        if (stepType === 'job_started' && ['in_transit', 'completed'].includes(job.status)) return 'completed';
        if (stepType === 'in_transit' && job.status === 'completed') return 'completed';
        if (stepType === 'completed' && job.status === 'completed') return 'completed';
        if (stepType === 'payment_processed' && job.request.payment_status === 'completed') return 'completed';
        if (stepType === 'rating_submitted' && job.timeline?.some((e) => e.type === 'rating_submitted')) return 'completed';

        return 'pending';
    };

    const getStepColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-green-500 dark:text-green-400';
            case 'pending':
                return 'text-gray-300 dark:text-gray-600';
            default:
                return 'text-gray-500 dark:text-gray-400';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Job Progress</h2>

                <div className="relative">
                    {/* Process steps */}
                    <div className="space-y-8">
                        {processSteps.map((step, index) => {
                            const status = getStepStatus(step.type);
                            const isCompleted = status === 'completed';
                            const isCurrent = index === processSteps.findIndex((s) => getStepStatus(s.type) === 'pending');
                            const event = job.timeline?.find((e) => e.type === step.type);

                            return (
                                <div key={step.type} className="relative pl-12">
                                    {/* Step icon */}
                                    <div
                                        className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                            isCompleted ? 'bg-green-100 dark:bg-green-900' : isCurrent ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={isCompleted ? faCheckCircle : step.icon} className={`text-lg ${getStepColor(status)}`} />
                                    </div>

                                    {/* Step content */}
                                    <div
                                        className={`p-4 rounded-lg ${
                                            isCompleted
                                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                                : isCurrent
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                                : 'bg-gray-50 dark:bg-gray-750'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3
                                                    className={`font-medium ${
                                                        isCompleted ? 'text-green-900 dark:text-green-100' : isCurrent ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                                                    }`}
                                                >
                                                    {step.title}
                                                </h3>
                                                {/* Show event details if available */}
                                                {event && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{event.description}</p>}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(event?.timestamp)}</div>
                                        </div>
                                    </div>

                                    {/* Connecting line */}
                                    {index < processSteps.length - 1 && (
                                        <div className={`absolute left-4 top-8 bottom-0 w-0.5 ${isCompleted ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Additional events section */}
                <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Additional Events</h3>
                    <div className="space-y-4">
                        {job.timeline
                            ?.filter((event) => !processSteps.some((step) => step.type === event.type))
                            .map((event, index) => (
                                <div key={event.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
                                    <FontAwesomeIcon icon={faCircle} className="text-gray-400 dark:text-gray-600 mt-1" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900 dark:text-white">{event.description}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(event.timestamp)}</p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimelineTab;
