import axiosInstance from './axiosInstance'

// Categories
export const fetchItemCategories = (params: any = {}) => axiosInstance.get('/item-categories/', { params });
export const fetchItemCategory = (id: any) => axiosInstance.get(`/item-categories/${id}/`);
export const createCategory = (data: any) => axiosInstance.post('/item-categories/', data);
export const updateCategory = (id: any, data: any) => axiosInstance.put(`/item-categories/${id}/`, data);
export const deleteCategory = (id: any) => axiosInstance.delete(`/item-categories/${id}/`);

// Types
export const fetchItemTypes = (categoryId?: number) =>
  axiosInstance.get('/item-types/', { params: { category_id: categoryId } });
export const fetchItemType = (id: any) => axiosInstance.get(`/item-types/${id}/`);
export const createType = (data: any) => axiosInstance.post('/item-types/', data);
export const updateType = (id: any, data: any) => axiosInstance.put(`/item-types/${id}/`, data);
export const deleteType = (id: any) => axiosInstance.delete(`/item-types/${id}/`);

// Brands
export const fetchItemBrands = (categoryId?: number) =>
  axiosInstance.get('/item-brands/', { params: { category_id: categoryId } });
export const fetchItemBrand = (id: any) => axiosInstance.get(`/item-brands/${id}/`);
export const createBrand = (data: any) => axiosInstance.post('/item-brands/', data);
export const updateBrand = (id: any, data: any) => axiosInstance.put(`/item-brands/${id}/`, data);
export const deleteBrand = (id: any) => axiosInstance.delete(`/item-brands/${id}/`);

// Models
export const fetchItemModels = (brandId?: number) =>
  axiosInstance.get('/item-models/', { params: { brand_id: brandId } });
export const fetchItemModel = (id: any) => axiosInstance.get(`/item-models/${id}/`);
export const createModel = (data: any) => axiosInstance.post('/item-models/', data);
export const updateModel = (id: any, data: any) => axiosInstance.put(`/item-models/${id}/`, data);
export const deleteModel = (id: any) => axiosInstance.delete(`/item-models/${id}/`);

// CommonItems
export const fetchCommonItems = (params: any = {}) => axiosInstance.get('/common-items/', { params });
export const fetchCommonItem = (id: any) => axiosInstance.get(`/common-items/${id}/`);
export const createCommonItem = (data: any) => axiosInstance.post('/common-items/', data);
export const updateCommonItem = (id: any, data: any) => axiosInstance.put(`/common-items/${id}/`, data);
export const deleteCommonItem = (id: any) => axiosInstance.delete(`/common-items/${id}/`);
export const searchCommonItems = (q: any) => axiosInstance.get('/common-items/search/', { params: { q } });
export const fetchCategoriesWithItems = () => axiosInstance.get('/common-items/categories_with_items/');

// Legacy exports for backward compatibility
export const createItemCategory = createCategory;
export const updateItemCategory = updateCategory;
export const deleteItemCategory = deleteCategory; 