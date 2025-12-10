import { useState, useCallback } from 'react';
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';

interface GuestUserData {
    name: string;
    email: string;
    phone: string;
    user_id?: string;
}

interface StoredGuestUserDetails {
    user_id: string;
    name: string;
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    savedAt: string;
}

interface AuthUser {
    user: {
        id: string;
        email: string;
        user_type: string;
        name?: string;
    };
}

export const useGuestUserModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [guestUserData, setGuestUserData] = useState<GuestUserData | null>(null);
    const isAuthenticated = useIsAuthenticated();
    const authUser = useAuthUser() as AuthUser | null;

    const openModal = useCallback(() => {
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const handleGuestUserSubmit = useCallback((userData: GuestUserData) => {
        setGuestUserData(userData);
        setIsModalOpen(false);

        // Note: The detailed user info with user_id is saved by the EmailModal itself
        // This is just for backward compatibility
        const legacyData = {
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
        };
        localStorage.setItem('guestUserData', JSON.stringify(legacyData));
    }, []);

    // Get stored guest user details (with user_id)
    const getStoredGuestDetails = useCallback((): StoredGuestUserDetails | null => {
        const storedDetails = localStorage.getItem('guestUserDetails');
        if (storedDetails) {
            try {
                const parsedDetails = JSON.parse(storedDetails);
                // Check if the data is not too old (optional: 30 days)
                const savedAt = new Date(parsedDetails.savedAt);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                if (savedAt > thirtyDaysAgo) {
                    return parsedDetails;
                } else {
                    // Remove old data
                    localStorage.removeItem('guestUserDetails');
                }
            } catch (error) {
                console.error('Error parsing stored guest details:', error);
                localStorage.removeItem('guestUserDetails');
            }
        }
        return null;
    }, []);

    // Check if user needs to provide contact details
    const requiresContactDetails = useCallback(() => {
        // If user is authenticated, they don't need to provide details
        if (isAuthenticated && authUser?.user) {
            return false;
        }

        // Check if we have stored guest details with user_id
        const storedDetails = getStoredGuestDetails();
        if (storedDetails) {
            // Convert stored details to GuestUserData format and set it
            const userData: GuestUserData = {
                name: storedDetails.name,
                email: storedDetails.email,
                phone: storedDetails.phone,
                user_id: storedDetails.user_id,
            };
            setGuestUserData(userData);
            return false;
        }

        // If guest user data is already provided, they don't need to provide again
        if (guestUserData) {
            return false;
        }

        // Check legacy localStorage format for backward compatibility
        const storedGuestData = localStorage.getItem('guestUserData');
        if (storedGuestData) {
            try {
                const parsedData = JSON.parse(storedGuestData);
                setGuestUserData(parsedData);
                return false;
            } catch (error) {
                localStorage.removeItem('guestUserData');
            }
        }

        return true;
    }, [isAuthenticated, authUser, guestUserData, getStoredGuestDetails]);

    // Function to handle actions that require user contact details
    const executeWithContactDetails = useCallback(
        (callback: (userData?: GuestUserData) => void) => {
            if (!requiresContactDetails()) {
                // User is authenticated or guest data is available
                let userData: GuestUserData;

                if (isAuthenticated && authUser?.user) {
                    userData = {
                        name: authUser.user.name || '',
                        email: authUser.user.email || '',
                        phone: '',
                        user_id: authUser.user.id,
                    };
                } else {
                    // Use guest data (which now includes user_id if available)
                    const storedDetails = getStoredGuestDetails();
                    userData = storedDetails
                        ? {
                              name: storedDetails.name,
                              email: storedDetails.email,
                              phone: storedDetails.phone,
                              user_id: storedDetails.user_id,
                          }
                        : guestUserData || {
                              name: '',
                              email: '',
                              phone: '',
                          };
                }

                callback(userData);
            } else {
                // Show modal to collect guest user details
                openModal();
            }
        },
        [requiresContactDetails, guestUserData, authUser, isAuthenticated, openModal, getStoredGuestDetails]
    );

    // Get current user data (authenticated user or guest user)
    const getCurrentUserData = useCallback((): GuestUserData | null => {
        if (isAuthenticated && authUser?.user) {
            return {
                name: authUser.user.name || '',
                email: authUser.user.email || '',
                phone: '',
                user_id: authUser.user.id,
            };
        }

        // Check for stored guest details first (includes user_id)
        const storedDetails = getStoredGuestDetails();
        if (storedDetails) {
            return {
                name: storedDetails.name,
                email: storedDetails.email,
                phone: storedDetails.phone,
                user_id: storedDetails.user_id,
            };
        }

        if (guestUserData) {
            return guestUserData;
        }

        // Check legacy localStorage for backward compatibility
        const storedGuestData = localStorage.getItem('guestUserData');
        if (storedGuestData) {
            try {
                return JSON.parse(storedGuestData);
            } catch (error) {
                localStorage.removeItem('guestUserData');
            }
        }

        return null;
    }, [isAuthenticated, authUser, guestUserData, getStoredGuestDetails]);

    // Clear guest user data (useful for logout or starting fresh)
    const clearGuestUserData = useCallback(() => {
        setGuestUserData(null);
        localStorage.removeItem('guestUserData');
        localStorage.removeItem('guestUserDetails');
    }, []);

    return {
        // Modal state
        isModalOpen,
        openModal,
        closeModal,

        // User data
        guestUserData,
        getCurrentUserData,
        clearGuestUserData,
        getStoredGuestDetails,

        // Actions
        handleGuestUserSubmit,
        executeWithContactDetails,
        requiresContactDetails,

        // User status
        isAuthenticated,
        authUser,
    };
};

export default useGuestUserModal;
