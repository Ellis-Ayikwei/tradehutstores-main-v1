import { faCalendarTimes, faCheckCircle, faLock, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import IconX from '../components/Icon/IconX';

export const renderStatus = (status: string) => {
    switch (status) {
        case 'ACTIVATED':
        case 'ACTIVE':
        case 'APPROVED':
        case 'COMPLETED':
            return (
                <span className="flex items-center text-xs bg-green-100 px-2 py-1 rounded-full">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 h-4 w-4" />
                    <span className="ml-1 text-green-500">{status.charAt(0) + status.slice(1).toLowerCase()}</span>
                </span>
            );
        
        case 'DEACTIVATED':
        case 'INACTIVE':
        case 'REJECTED':
        case 'FAILED':
        case 'TERMINATED':
            return (
                <span className="flex items-center text-xs bg-red-100 px-2 py-1 rounded-full">
                    <IconX className={`text-red-${status === 'TERMINATED' ? '800' : '500'} h-4 w-4`} />
                    <span className={`ml-1 text-red-${status === 'TERMINATED' ? '800' : '500'}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
                </span>
            );
        case 'LOCKED':
            return (
                <span className="flex items-center text-xs bg-yellow-100 px-2 py-1 rounded-full">
                    <FontAwesomeIcon icon={faLock} className="text-yellow-500 h-4 w-4" />
                    <span className="ml-1 text-yellow-500">Locked</span>
                </span>
            );
        case 'EXPIRED':
            return (
                <span className="flex items-center text-xs bg-red-100 px-2 py-1 rounded-full">
                    <FontAwesomeIcon icon={faCalendarTimes} className="text-red-700 h-3 w-4" />
                    <span className="ml-1 text-red-700">EXPIRED</span>
                </span>
            );
        case 'PENDING':
            return (
                <span className="flex items-center text-xs bg-blue-100 px-2 py-1 rounded-full">
                    <FontAwesomeIcon icon={faQuestionCircle} className="text-blue-500 h-4 w-4" />
                    <span className="ml-1 text-blue-500">Pending</span>
                </span>
            );
        case 'SUPER_ADMIN':
        case 'ADMIN':
        case 'REGULAR':
        case 'UNDERWRITER':
        case 'PREMIUM_ADMIN':
        case 'SALES':
        case 'MEMBER':
            return (
                <span className="flex items-center text-xs bg-purple-100 px-2 py-1 rounded-full">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-purple-500 h-4 w-4" />
                    <span className="ml-1 text-purple-500">{status.replace('_', ' ').toLowerCase()}</span>
                </span>
            );
        default:
            return (
                <span className="flex items-center text-xs">
                    <FontAwesomeIcon icon={faQuestionCircle} className="text-gray-500 h-4 w-4" />
                    <span className="ml-1 text-gray-500">Unknown</span>
                </span>
            );
    }
};
