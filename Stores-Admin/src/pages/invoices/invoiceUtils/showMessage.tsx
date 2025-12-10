import { showNotification } from '../../../../utilities/showNotifcation';

const showMessage = (msg = '', type = 'success') => {
    // Map the old type to the new notification type
    const notificationType = type === 'error' ? 'error' : 
                           type === 'warning' ? 'warning' : 
                           type === 'info' ? 'info' : 
                           'success';
    
    showNotification({
        message: msg,
        type: notificationType,
        showHide: true
    });
};

export default showMessage;