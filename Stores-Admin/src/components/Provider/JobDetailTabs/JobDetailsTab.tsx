import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faGavel, faRoute, faUser, faCheckCircle, faExclamationTriangle, faStar, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Job } from '../../../types/job';

interface JobDetailsTabProps {
    job: Job;
}

const JobDetailsTab: React.FC<JobDetailsTabProps> = ({ job }) => {
    const [showFullInstructions, setShowFullInstructions] = React.useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Job Details</h2>

            {/* Job type and requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Job Type</h3>
                    <div className="flex items-center">
                        <div
                            className={`h-10 w-10 rounded-md flex items-center justify-center mr-3 ${
                                job.request.request_type === 'instant'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                                    : job.request.request_type === 'auction'
                                    ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                                    : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            }`}
                        >
                            <FontAwesomeIcon icon={job.request.request_type === 'instant' ? faBolt : job.request.request_type === 'auction' ? faGavel : faRoute} />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {job.request.request_type === 'instant' ? 'Instant Booking' : job.request.request_type === 'auction' ? 'Auction Job' : 'Multi-Stop Journey'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {job.request.request_type === 'instant'
                                    ? 'Direct booking with fixed price'
                                    : job.request.request_type === 'auction'
                                    ? 'Open for competitive bidding'
                                    : 'Multiple pickup and dropoff points'}
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Personnel Required</h3>
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mr-3">
                            <FontAwesomeIcon icon={faUser} />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">{job.request.required_qualifications?.join(', ') || 'No specific qualifications required'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Recommended for this job</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description section */}
            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Job Description</h3>
                <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{job.request.notes || 'No additional notes provided'}</p>
                </div>
            </div>

            {/* Special instructions */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Special Instructions</h3>
                    <button onClick={() => setShowFullInstructions(!showFullInstructions)} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        {showFullInstructions ? 'Show Less' : 'Show All'}
                    </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
                    <p className={`text-gray-800 dark:text-gray-200 whitespace-pre-line ${!showFullInstructions && 'line-clamp-5'}`}>
                        {job.request.special_instructions || 'No special instructions provided'}
                    </p>
                </div>
            </div>

            {/* Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {job.request.required_qualifications && job.request.required_qualifications.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Required Qualifications</h3>
                        <ul className="space-y-2">
                            {job.request.required_qualifications.map((req, index) => (
                                <li key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" />
                                    {req}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {job.request.special_requirements && job.request.special_requirements.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Special Requirements</h3>
                        <ul className="space-y-2">
                            {job.request.special_requirements.map((req, index) => (
                                <li key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-orange-500 mr-2" />
                                    {req}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Customer information */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Customer Information</h3>
                <div className="flex items-center mb-4">
                    {job.request.contact_avatar ? (
                        <img src={job.request.contact_avatar} alt={job.request.contact_name} className="h-12 w-12 rounded-full mr-4 object-cover" />
                    ) : (
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-4">
                            <FontAwesomeIcon icon={faUser} />
                        </div>
                    )}
                    <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{job.request.contact_name}</h4>
                        {job.request.contact_company && <p className="text-sm text-gray-500 dark:text-gray-400">{job.request.contact_company}</p>}
                        {job.request.contact_rating && (
                            <div className="flex items-center mt-1">
                                {Array(5)
                                    .fill(0)
                                    .map((_, i) => (
                                        <FontAwesomeIcon
                                            key={i}
                                            icon={faStar}
                                            className={`w-3.5 h-3.5 ${
                                                i < Math.floor(job.request.contact_rating || 0)
                                                    ? 'text-yellow-400'
                                                    : i < (job.request.contact_rating || 0)
                                                    ? 'text-yellow-300'
                                                    : 'text-gray-300 dark:text-gray-600'
                                            }`}
                                        />
                                    ))}
                                <span className="ml-1.5 text-xs text-gray-600 dark:text-gray-400">{(job.request.contact_rating || 0).toFixed(1)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {job.request.contact_phone && (
                        <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-3">
                                <FontAwesomeIcon icon={faPhone} className="text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{job.request.contact_phone}</p>
                            </div>
                        </div>
                    )}

                    {job.request.contact_email && (
                        <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-3">
                                <FontAwesomeIcon icon={faEnvelope} className="text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{job.request.contact_email}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobDetailsTab;
