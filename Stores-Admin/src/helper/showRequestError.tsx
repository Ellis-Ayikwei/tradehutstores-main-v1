import { showNotification } from '../utilities/showNotifcation';

const ShowRequestError = (error: any) => {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    try {
        const responseData = error?.response?.data;

        if (typeof responseData === 'string') {
            // Try parsing HTML error pages
            const parser = new DOMParser();
            const doc = parser.parseFromString(responseData, 'text/html');
            const bodyText = doc.querySelector('body')?.innerText?.trim();

            if (bodyText) errorMessage = bodyText;
        } else if (typeof responseData === 'object' && responseData !== null) {
            // JSON error structure handling

            // Handle DRF-style { detail: "..." }
            if (responseData.detail) {
                errorMessage = responseData.detail;

                // Handle field errors like { email: ["required"], password: ["too short"] }
            } else {
                const messages: string[] = [];
                for (const [key, value] of Object.entries(responseData)) {
                    if (Array.isArray(value)) {
                        messages.push(`${key}: ${value.join(', ')}`);
                    } else if (typeof value === 'string') {
                        messages.push(`${key}: ${value}`);
                    }
                }

                if (messages.length > 0) {
                    errorMessage = messages.join('\n');
                }
            }
        } else if (error.message) {
            // Axios/network error fallback
            errorMessage = error.message;
        }
    } catch (parseErr) {
        console.warn('Failed to parse error response:', parseErr);
    }

    console.error('Full Error:', error);
    showNotification({
        message: errorMessage,
        type: 'error',
        showHide: true
    });
};

export default ShowRequestError;
