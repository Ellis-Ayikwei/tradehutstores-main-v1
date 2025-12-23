import { faHome, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center">
                <div>
                    <FontAwesomeIcon icon={faTriangleExclamation} className="mx-auto h-16 w-16 text-yellow-500" />
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">404 - Page Not Found</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
                </div>
                <div>
                    <Link to="/" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        <FontAwesomeIcon icon={faHome} className="mr-2" />
                        Back to Homepage
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
