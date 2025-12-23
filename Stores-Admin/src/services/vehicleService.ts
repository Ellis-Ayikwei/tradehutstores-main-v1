import axiosInstance from './axiosInstance';

export interface Vehicle {
    id: string;
    registration: string;
    make: string;
    model: string;
    year: number;
    seats: number;
    vehicle_type: { id: string; name: string } | null;
    vehicle_category: { id: string; name: string } | null;
    fuel_type: string;
    transmission: string;
    color: string;
    payload_capacity_kg: number;
    gross_vehicle_weight_kg: number;
    max_length_m: number | null;
    load_volume_m3: number;
    insurance_policy_number: string;
    insurance_expiry_date: string | null;
    fleet_number: string;
    has_tail_lift: boolean;
    has_tracking_device: boolean;
    has_dash_cam: boolean;
    additional_features: any;
    provider: string[];
    primary_driver: { id: string; name: string } | null;
    is_active: boolean;
    location: any;
    last_location_update: string | null;
    primary_location: { id: string; name: string } | null;
    is_available: boolean;
    copy_of_log_book?: string | null;
    copy_of_MOT?: string | null;
    V5_Document?: string | null;
    images?: string[];
    created_at: string;
    updated_at: string;
}

export interface VehicleFilters {
    provider?: string;
    type?: string;
    active?: boolean;
    registration?: string;
    driver?: string;
}

export interface VehicleDocument {
    id: string;
    vehicle: string;
    document_type: string;
    file_url: string;
    expiry_date?: string;
    is_valid: boolean;
    created_at: string;
    updated_at: string;
}

export interface VehicleInspection {
    id: string;
    vehicle: string;
    inspection_type: string;
    inspection_date: string;
    inspector_name: string;
    result: 'pass' | 'fail' | 'conditional';
    notes?: string;
    next_inspection_date?: string;
    created_at: string;
    updated_at: string;
}

export interface MaintenanceRecord {
    id: string;
    vehicle: string;
    maintenance_type: string;
    service_date: string;
    mileage_at_service: number;
    service_provider: string;
    cost: number;
    description: string;
    next_service_date?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateVehicleData {
    registration: string;
    make: string;
    model: string;
    year: number;
    seats?: number;
    vehicle_type: string;
    vehicle_category?: string;
    fuel_type?: string;
    transmission?: string;
    color?: string;
    payload_capacity_kg?: number;
    gross_vehicle_weight_kg?: number;
    max_length_m?: number | null;
    load_volume_m3?: number;
    insurance_policy_number?: string;
    insurance_expiry_date?: string;
    fleet_number?: string;
    has_tail_lift?: boolean;
    has_tracking_device?: boolean;
    has_dash_cam?: boolean;
    additional_features?: any;
    provider_id: string;
    primary_driver?: string;
    is_active?: boolean;
    location?: any;
    last_location_update?: string | null;
    primary_location?: string | {
        address: string;
        coordinates: { lat: number; lng: number };
        components: {
            address_line1: string;
            city: string;
            county: string;
            postcode: string;
            country: string;
        };
    };
    is_available?: boolean;
    copy_of_log_book?: string | null;
    copy_of_MOT?: string | null;
    V5_Document?: string | null;
    images?: string[];
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {
    id: string;
}

class VehicleService {
    private baseUrl = '/vehicles/';

    /**
     * Get all vehicles with optional filters
     */
    async getVehicles(filters?: VehicleFilters): Promise<Vehicle[]> {
        const params = new URLSearchParams();
        
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, String(value));
                }
            });
        }

        const response = await axiosInstance.get(`${this.baseUrl}?${params.toString()}`);
        return response.data;
    }

    /**
     * Get a single vehicle by ID
     */
    async getVehicle(id: string): Promise<Vehicle> {
        const response = await axiosInstance.get(`${this.baseUrl}${id}/`);
        return response.data;
    }

    /**
     * Create a new vehicle
     */
    async createVehicle(data: CreateVehicleData): Promise<Vehicle> {
        const response = await axiosInstance.post(this.baseUrl, data);
        return response.data;
    }

    /**
     * Update an existing vehicle
     */
    async updateVehicle(id: string, data: Partial<CreateVehicleData>): Promise<Vehicle> {
        const response = await axiosInstance.patch(`${this.baseUrl}${id}/`, data);
        return response.data;
    }

    /**
     * Delete a vehicle
     */
    async deleteVehicle(id: string): Promise<void> {
        await axiosInstance.delete(`${this.baseUrl}${id}/`);
    }

    /**
     * Get vehicle documents
     */
    async getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
        const response = await axiosInstance.get(`${this.baseUrl}${vehicleId}/documents/`);
        return response.data;
    }

    /**
     * Get vehicle inspections
     */
    async getVehicleInspections(vehicleId: string): Promise<VehicleInspection[]> {
        const response = await axiosInstance.get(`${this.baseUrl}${vehicleId}/inspections/`);
        return response.data;
    }

    /**
     * Get vehicle maintenance records
     */
    async getVehicleMaintenance(vehicleId: string): Promise<MaintenanceRecord[]> {
        const response = await axiosInstance.get(`${this.baseUrl}${vehicleId}/maintenance/`);
        return response.data;
    }

    /**
     * Update vehicle mileage
     */
    async updateVehicleMileage(vehicleId: string, mileage: number): Promise<Vehicle> {
        const response = await axiosInstance.post(`${this.baseUrl}${vehicleId}/update_mileage/`, {
            mileage
        });
        return response.data;
    }

    /**
     * Upload vehicle photos
     */
    async uploadVehiclePhotos(vehicleId: string, images: File[]): Promise<Vehicle> {
        const formData = new FormData();
        console.log('Uploading vehicle photos:', images.length);
        images.forEach((image, index) => {
            formData.append('images', image);
        });

        const response = await axiosInstance.post(`${this.baseUrl}${vehicleId}/photos/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    /**
     * Upload vehicle documents
     */
    async uploadVehicleDocuments(vehicleId: string, documents: { [key: string]: File }): Promise<Vehicle> {
        const formData = new FormData();
        
        console.log('Uploading vehicle documents:', Object.keys(documents));
        Object.entries(documents).forEach(([documentType, file]) => {
            if (file) {
                formData.append('document', file);
                formData.append('document_type', documentType);
            }
        });

        const response = await axiosInstance.post(`${this.baseUrl}${vehicleId}/documents/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    /**
     * Create vehicle with images and documents
     */
    async createVehicleWithImagesAndDocuments(data: CreateVehicleData, images?: File[], documents?: { [key: string]: File }): Promise<Vehicle> {
        console.log('=== CREATE VEHICLE WITH IMAGES AND DOCUMENTS ===');
        console.log('Received data:', data);
        console.log('Received images:', images);
        console.log('Received documents:', documents);
        console.log('Images length:', images?.length || 0);
        console.log('Documents keys:', documents ? Object.keys(documents) : []);
        
        // Step 1: Create the vehicle (without images/documents)
        const vehicleData = { ...data };
        
        // Remove image/document fields from the main data
        delete vehicleData.images;
        delete vehicleData.copy_of_log_book;
        delete vehicleData.copy_of_MOT;
        delete vehicleData.V5_Document;
        
        console.log('Vehicle data after cleanup:', vehicleData);
        const vehicle = await this.createVehicle(vehicleData);
        
        // Step 2: Upload images if provided
        if (images && images.length > 0) {
            console.log('Uploading images:', images.length);
            const imageFormData = new FormData();
            images.forEach((image, index) => {
                console.log(`Adding image ${index}:`, image.name, image.type, image.size);
                imageFormData.append('image', image);
            });
            
            console.log('Image FormData contents:');
            for (let [key, value] of imageFormData.entries()) {
                console.log(`${key}:`, value);
            }
            
            try {
                await axiosInstance.post(`${this.baseUrl}${vehicle.id}/photos/`, imageFormData, {
                    headers: {
                        'Content-Type': undefined,
                    },
                });
                console.log('Images uploaded successfully');
            } catch (error) {
                console.error('Error uploading images:', error);
            }
        } else {
            console.log('No images to upload');
        }
        
        // Step 3: Upload documents if provided
        if (documents && Object.keys(documents).length > 0) {
            console.log('Uploading documents:', Object.keys(documents));
            
            for (const [documentType, file] of Object.entries(documents)) {
                if (file) {
                    console.log(`Uploading document ${documentType}:`, file.name, file.type, file.size);
                    const documentFormData = new FormData();
                    documentFormData.append('document', file);
                    documentFormData.append('document_type', documentType);
                    
                    console.log(`Document ${documentType} FormData contents:`);
                    for (let [key, value] of documentFormData.entries()) {
                        console.log(`${key}:`, value);
                    }
                    
                    try {
                        await axiosInstance.post(`${this.baseUrl}${vehicle.id}/documents/`, documentFormData, {
                            headers: {
                                'Content-Type': undefined,
                            },
                        });
                        console.log(`Document ${documentType} uploaded successfully`);
                    } catch (error) {
                        console.error(`Error uploading document ${documentType}:`, error);
                    }
                }
            }
        } else {
            console.log('No documents to upload');
        }
        
        // Return the created vehicle
        return vehicle;
    }

    /**
     * Update vehicle with images
     */
    async updateVehicleWithImages(vehicleId: string, data: Partial<CreateVehicleData>, images?: File[], existingImages?: string[]): Promise<Vehicle> {
        const formData = new FormData();
        
        // Add all form data
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object') {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            }
        });

        // Add new images if provided
        if (images) {
            images.forEach((image) => {
                formData.append('images', image);
            });
        }

        // Add existing image URLs if provided
        if (existingImages && existingImages.length > 0) {
            formData.append('existing_images', JSON.stringify(existingImages));
        }

        const response = await axiosInstance.patch(`${this.baseUrl}${vehicleId}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    /**
     * Update vehicle with images and documents
     */
    async updateVehicleWithImagesAndDocuments(vehicleId: string, data: Partial<CreateVehicleData>, images?: File[], documents?: { [key: string]: File }): Promise<Vehicle> {
        console.log('=== UPDATE VEHICLE WITH IMAGES AND DOCUMENTS ===');
        console.log('Vehicle ID:', vehicleId);
        console.log('Received data:', data);
        console.log('Received images:', images);
        console.log('Received documents:', documents);
        console.log('Images length:', images?.length || 0);
        console.log('Documents keys:', documents ? Object.keys(documents) : []);
        
        // Step 1: Update the vehicle (without images/documents)
        const vehicleData = { ...data };
        
        // Remove image/document fields from the main data
        delete vehicleData.images;
        delete vehicleData.copy_of_log_book;
        delete vehicleData.copy_of_MOT;
        delete vehicleData.V5_Document;
        
        console.log('Vehicle data after cleanup:', vehicleData);
        const vehicle = await this.updateVehicle(vehicleId, vehicleData);
        
        // Step 2: Upload new images if provided
        if (images && images.length > 0) {
            console.log('Uploading new images:', images.length);
            const imageFormData = new FormData();
            images.forEach((image, index) => {
                console.log(`Adding image ${index}:`, image.name, image.type, image.size);
                imageFormData.append('image', image);
            });
            
            console.log('Image FormData contents:');
            for (let [key, value] of imageFormData.entries()) {
                console.log(`${key}:`, value);
            }
            
            try {
                await axiosInstance.post(`${this.baseUrl}${vehicleId}/photos/`, imageFormData, {
                    headers: {
                        'Content-Type': undefined,
                    },
                });
                console.log('Images uploaded successfully');
            } catch (error) {
                console.error('Error uploading images:', error);
            }
        } else {
            console.log('No new images to upload');
        }
        
        // Step 3: Upload new documents if provided
        if (documents && Object.keys(documents).length > 0) {
            console.log('Uploading new documents:', Object.keys(documents));
            
            for (const [documentType, file] of Object.entries(documents)) {
                if (file) {
                    console.log(`Uploading document ${documentType}:`, file.name, file.type, file.size);
                    const documentFormData = new FormData();
                    documentFormData.append('document', file);
                    documentFormData.append('document_type', documentType);
                    
                    console.log(`Document ${documentType} FormData contents:`);
                    for (let [key, value] of documentFormData.entries()) {
                        console.log(`${key}:`, value);
                    }
                    
                    try {
                        await axiosInstance.post(`${this.baseUrl}${vehicleId}/documents/`, documentFormData, {
                            headers: {
                                'Content-Type': undefined,
                            },
                        });
                        console.log(`Document ${documentType} uploaded successfully`);
                    } catch (error) {
                        console.error(`Error uploading document ${documentType}:`, error);
                    }
                }
            }
        } else {
            console.log('No new documents to upload');
        }
        
        // Return the updated vehicle
        return vehicle;
    }

    /**
     * Get vehicles by provider
     */
    async getVehiclesByProvider(providerId: string): Promise<Vehicle[]> {
        return this.getVehicles({ provider: providerId });
    }

    /**
     * Get active vehicles
     */
    async getActiveVehicles(): Promise<Vehicle[]> {
        return this.getVehicles({ active: true });
    }

    /**
     * Get vehicles by type
     */
    async getVehiclesByType(vehicleType: string): Promise<Vehicle[]> {
        return this.getVehicles({ type: vehicleType });
    }

    /**
     * Search vehicles by registration
     */
    async searchVehiclesByRegistration(registration: string): Promise<Vehicle[]> {
        return this.getVehicles({ registration });
    }

    /**
     * Get vehicles by driver
     */
    async getVehiclesByDriver(driverId: string): Promise<Vehicle[]> {
        return this.getVehicles({ driver: driverId });
    }

    /**
     * Bulk update vehicle status
     */
    async bulkUpdateVehicleStatus(vehicleIds: string[], isActive: boolean): Promise<Vehicle[]> {
        const response = await axiosInstance.patch(`${this.baseUrl}bulk_update_status/`, {
            vehicle_ids: vehicleIds,
            is_active: isActive
        });
        return response.data;
    }

    /**
     * Get vehicle statistics
     */
    async getVehicleStatistics(): Promise<{
        total: number;
        active: number;
        inactive: number;
        by_type: Record<string, number>;
        by_provider: Record<string, number>;
    }> {
        const response = await axiosInstance.get(`${this.baseUrl}statistics/`);
        return response.data;
    }
}

export default new VehicleService(); 