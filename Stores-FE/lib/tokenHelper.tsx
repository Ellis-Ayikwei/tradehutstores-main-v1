import authAxiosInstance from '../helper/authAxiosInstance';

export const refreshTokens = async () => {
    try {
        const response = await authAxiosInstance.post('/refresh_token');
        const accessToken = response.headers['authorization']?.split(' ')[1];
        const refreshToken = response.headers['x-refresh-token'];

        return { accessToken, refreshToken };
    } catch (error: any) {
        throw new Error('Failed to refresh tokens');
    }
};
