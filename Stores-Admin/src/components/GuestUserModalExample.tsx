import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign, faCalculator } from '@fortawesome/free-solid-svg-icons';
import EmailModal from '../pages/user/EmailModal';
import { useGuestUserModal } from '../hooks/useGuestUserModal';

/**
 * Example component showing how to integrate the guest user modal
 * into any component that requires user contact details.
 *
 * This pattern can be used for:
 * - Get Price buttons
 * - Quote requests
 * - Newsletter signups
 * - Any action that requires user contact information
 */
const GuestUserModalExample: React.FC = () => {
    const { isModalOpen, closeModal, handleGuestUserSubmit, executeWithContactDetails, getCurrentUserData, isAuthenticated } = useGuestUserModal();

    // Example: Handle getting quotes/prices
    const handleGetQuotes = () => {
        executeWithContactDetails((userData) => {
            if (userData) {
                console.log('User data available:', userData);
                // Proceed with getting quotes
                // This could be:
                // - API call to get quotes
                // - Redirect to pricing page
                // - Show quotes modal
                // - etc.

                alert(`Getting quotes for ${userData.name} (${userData.email})`);
            }
        });
    };

    // Example: Handle newsletter signup
    const handleNewsletterSignup = () => {
        executeWithContactDetails((userData) => {
            if (userData) {
                // Subscribe user to newsletter
                console.log('Subscribing to newsletter:', userData.email);
                alert(`Subscribed ${userData.email} to newsletter!`);
            }
        });
    };

    const currentUser = getCurrentUserData();

    return (
        <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            {/* Email Modal */}
            <EmailModal isOpen={isModalOpen} onClose={closeModal} onSubmit={handleGuestUserSubmit} title="Get Your Quote! 💰" subtitle="Enter your details to receive personalized moving quotes." />

            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Guest User Modal Example</h3>

            {/* Show current user status */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Current Status:</h4>
                {isAuthenticated ? (
                    <p className="text-green-600 dark:text-green-400">✅ Authenticated User</p>
                ) : currentUser ? (
                    <p className="text-blue-600 dark:text-blue-400">
                        👤 Guest User: {currentUser.name} ({currentUser.email})
                    </p>
                ) : (
                    <p className="text-gray-600 dark:text-gray-400">❓ No user data available</p>
                )}
            </div>

            {/* Example action buttons */}
            <div className="space-y-3">
                <button
                    onClick={handleGetQuotes}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                    <FontAwesomeIcon icon={faDollarSign} />
                    <span>Get Moving Quotes</span>
                </button>

                <button
                    onClick={handleNewsletterSignup}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                    <FontAwesomeIcon icon={faCalculator} />
                    <span>Subscribe to Newsletter</span>
                </button>
            </div>

            {/* Usage instructions */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works:</h5>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• If user is authenticated → Proceed directly</li>
                    <li>• If guest data exists → Use stored data</li>
                    <li>• If no data → Show modal to collect details</li>
                    <li>• Guest data persists across page refreshes</li>
                </ul>
            </div>
        </div>
    );
};

export default GuestUserModalExample;
