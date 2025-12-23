import showMessage from './showMessage';

const ShowRequestError = (error: any) => {
    const parser = new DOMParser();
    const errorData = error.response?.data || 'An error occurred, please try again';
    const doc = parser.parseFromString(errorData, 'text/html');
    const errorMess = doc.querySelector('body')?.innerText || 'An error occurred';
    const errorMessage = errorMess.split('\n')[1] || errorMess;
    console.error('Error:', error);
    showMessage(`${errorMessage}`, 'error');
};

export default ShowRequestError;
