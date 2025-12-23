import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faEdit, faTrash, faFileAlt } from '@fortawesome/free-solid-svg-icons';

interface BookingActionsProps {
    status: string;
    userRole: 'customer' | 'provider';
    onConfirm: () => void;
    onCancel: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onViewInvoice: () => void;
}

const BookingActions: React.FC<BookingActionsProps> = ({ status, userRole, onConfirm, onCancel, onEdit, onDelete, onViewInvoice }) => {
    const getStatusActions = () => {
        switch (status) {
            case 'pending':
                return userRole === 'customer' ? (
                    <>
                        <button onClick={onConfirm} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mr-2">
                            <FontAwesomeIcon icon={faCheck} className="mr-2" />
                            Confirm
                        </button>
                        <button onClick={onCancel} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                            <FontAwesomeIcon icon={faTimes} className="mr-2" />
                            Cancel
                        </button>
                    </>
                ) : null;
            case 'confirmed':
                return (
                    <>
                        <button onClick={onViewInvoice} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-2">
                            <FontAwesomeIcon icon={faFileAlt} className="mr-2" />
                            View Invoice
                        </button>
                        {userRole === 'customer' && (
                            <button onClick={onCancel} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                                Cancel
                            </button>
                        )}
                    </>
                );
            case 'completed':
                return (
                    <button onClick={onViewInvoice} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                        <FontAwesomeIcon icon={faFileAlt} className="mr-2" />
                        View Invoice
                    </button>
                );
            case 'cancelled':
                return userRole === 'customer' ? (
                    <button onClick={onDelete} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                        <FontAwesomeIcon icon={faTrash} className="mr-2" />
                        Delete
                    </button>
                ) : null;
            default:
                return null;
        }
    };

    return (
        <div className="flex justify-end space-x-4">
            {getStatusActions()}
            {status === 'draft' && (
                <button onClick={onEdit} className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700">
                    <FontAwesomeIcon icon={faEdit} className="mr-2" />
                    Edit
                </button>
            )}
        </div>
    );
};

export default BookingActions;
