import axiosInstance from './axiosInstance';

/**
 * Asynchronous function that makes a GET request to the server using axiosInstance
 * and returns the response data.
 *
 * @param {string} url - The URL to make the request to.
 * @param {object} [config] - Optional axios request config.
 * @returns {Promise} - A promise that resolves to the response data.
 */
const fetcher = async (url: string, config: object = {}): Promise<any> => {
    try {
        if (!url) {
            throw new Error('No URL provided');
        }
        const response = await axiosInstance.get(url, config);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export default fetcher;
