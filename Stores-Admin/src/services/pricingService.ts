import axiosInstance from './axiosInstance';

// --- Pricing Configurations ---
export const getPricingConfigurations = async () => {
  return axiosInstance.get('/configurations/');
};

export const createPricingConfiguration = async (data: any) => {
  return axiosInstance.post('/configurations/', data);
};

export const updatePricingConfiguration = async (id: number, data: any) => {
  return axiosInstance.put(`/configurations/${id}/`, data);
};

export const deletePricingConfiguration = async (id: number) => {
  return axiosInstance.delete(`/configurations/${id}/`);
};

export const setDefaultPricingConfiguration = async (id: number) => {
  return axiosInstance.patch('/configurations/set-default/', { configuration_id: id });
};
