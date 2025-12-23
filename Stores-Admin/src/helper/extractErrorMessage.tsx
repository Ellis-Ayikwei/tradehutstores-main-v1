const extractErrorMessage = (htmlResponse: any) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlResponse, 'text/html');
    const pContent = doc.querySelector('p')?.textContent || 'No error message found';
    return pContent;
};

export default extractErrorMessage;
