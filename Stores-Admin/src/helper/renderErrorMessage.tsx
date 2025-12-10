const renderErrorMessage = (error: any) => {
    console.log('the error1 .........', error);
    
    // Handle Axios error structure
    if (error.response?.data) {
        const errorData = error.response.data;
        
        // Check for validation errors format
        if (errorData.validation_errors || errorData.details) {
            const validationErrors = errorData.validation_errors || errorData.details;
            const errorMessages = [];
            
            // Extract all validation error messages
            for (const [field, messages] of Object.entries(validationErrors)) {
                if (Array.isArray(messages)) {
                    errorMessages.push(...messages);
                } else if (typeof messages === 'string') {
                    errorMessages.push(messages);
                }
            }
            
            // Return the first error message or join multiple messages
            if (errorMessages.length > 0) {
                return errorMessages.length === 1 
                    ? errorMessages[0] 
                    : errorMessages.join(', ');
            }
        }
        
        // Check for direct message field
        if (errorData.message) {
            return errorData.message;
        }
        
        // Check for error field
        if (errorData.error) {
            return errorData.error;
        }
        
        // If errorData is a string, return it directly
        if (typeof errorData === 'string') {
            return errorData;
        }
    }
    
    // Handle Axios error without response data
    if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        
        // Provide user-friendly messages for common HTTP status codes
        switch (status) {
            case 400:
                return 'Bad Request: The request data is invalid.';
            case 401:
                return 'Unauthorized: Please log in again.';
            case 403:
                return 'Forbidden: You do not have permission to perform this action.';
            case 404:
                return 'Not Found: The requested resource was not found.';
            case 409:
                return 'Conflict: The resource already exists or conflicts with existing data.';
            case 422:
                return 'Validation Error: Please check your input data.';
            case 500:
                return 'Server Error: Please try again later.';
            default:
                return `Request failed with status ${status}: ${statusText}`;
        }
    }
    
    // Handle network errors or other Axios errors
    if (error.code) {
        switch (error.code) {
            case 'ERR_NETWORK':
                return 'Network Error: Please check your internet connection.';
            case 'ERR_BAD_REQUEST':
                return 'Bad Request: The request data is invalid.';
            case 'ERR_BAD_RESPONSE':
                return 'Server Error: Invalid response from server.';
            case 'ERR_TIMEOUT':
                return 'Request Timeout: Please try again.';
            default:
                return error.message || 'An error occurred, please try again.';
        }
    }
    
    // Fallback to HTML parsing for legacy error formats
    try {
        const parser = new DOMParser();
        const errorData = error.response?.data || 'An error occurred, please try again';
        const doc = parser.parseFromString(errorData, 'text/html');
        const errorMess = doc.querySelector('body')?.innerText || 'An error occurred';
        const errorMessage = error.response?.data.message ?? (errorMess.split('\n')[1] || errorMess);
        return errorMessage;
    } catch (parseError) {
        // Final fallback
        return error.message || 'An error occurred, please try again';
    }
};

export default renderErrorMessage;
