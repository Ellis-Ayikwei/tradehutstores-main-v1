import { notification } from 'antd';

const showMessage = (msg = '', type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    console.log('showMessage called with:', msg, type);
    const titles = {
        success: 'Success',
        error: 'Error',
        info: 'Info',
        warning: 'Warning',
    };

    // Directly call the static API
    notification[type]({
        message: titles[type] || 'Notification',
        description: msg,
        duration: 3,
        placement: 'topRight',
    });
};

export default showMessage;
