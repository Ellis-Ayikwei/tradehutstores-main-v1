import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { IconX, IconBell, IconCheck, IconAlertCircle } from '@tabler/icons-react';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    selectedPrice: any;
    saving: boolean;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    selectedPrice,
    saving
}) => {
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notifyUser, setNotifyUser] = useState(true);

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                            Confirm Price Update
                                        </Dialog.Title>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            Review the price change and notify the user
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <IconX className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Selected Price Summary */}
                                {selectedPrice && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Selected Price Option</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-300">Price:</span>
                                                <span className="ml-2 text-blue-900 dark:text-blue-100 font-bold">£{selectedPrice.price}</span>
                                            </div>
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-300">Staff:</span>
                                                <span className="ml-2 text-blue-900 dark:text-blue-100">{selectedPrice.staff_count} member{selectedPrice.staff_count > 1 ? 's' : ''}</span>
                                            </div>
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-300">Duration:</span>
                                                <span className="ml-2 text-blue-900 dark:text-blue-100">{selectedPrice.estimated_duration}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Notification Settings */}
                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="notify_user"
                                            checked={notifyUser}
                                            onChange={(e) => setNotifyUser(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <label htmlFor="notify_user" className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <IconBell className="w-4 h-4" />
                                            Notify user of price change
                                        </label>
                                    </div>

                                    {notifyUser && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Notification Message
                                            </label>
                                            <textarea
                                                value={notificationMessage}
                                                onChange={(e) => setNotificationMessage(e.target.value)}
                                                rows={4}
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Your request price has been updated to £{price} with {staff_count} staff members. The estimated duration is {duration}. Please review and confirm if this works for you."
                                            />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Leave empty to use the default message, or customize the notification.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Warning */}
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                                    <div className="flex items-start">
                                        <IconAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                                Important Notice
                                            </h4>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                                This will update the request price and notify the user. The user will need to confirm the new price before the request can proceed.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end space-x-3">
                                    <button
                                        onClick={onClose}
                                        disabled={saving}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={saving}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                <IconCheck className="w-4 h-4" />
                                                Confirm & Notify User
                                            </>
                                        )}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default NotificationModal;
