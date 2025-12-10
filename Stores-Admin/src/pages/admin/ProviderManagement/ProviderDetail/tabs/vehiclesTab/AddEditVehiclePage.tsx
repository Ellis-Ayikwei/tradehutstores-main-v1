import { Calendar, Cog, Edit, Fuel, IdCard, Image as ImageIcon, Palette, Plus, Ruler, Shield, Truck, User, Weight, Wrench, X, ArrowLeft, FileText, Cookie, MapPin } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import vehicleService, { CreateVehicleData } from '../../../../../../services/vehicleService';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import showMessage from '../../../../../../helper/showMessage';
import axiosInstance from '../../../../../../services/axiosInstance';
import useSWR from 'swr';
import fetcher from '../../../../../../services/fetcher';
import Select from 'react-select';
import AddressAutocomplete from '../../../../../../components/AddressAutocomplete';



const FUEL_TYPES = [
    { value: 'diesel', label: 'Diesel' },
    { value: 'petrol', label: 'Petrol' },
    { value: 'electric', label: 'Electric' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'plugin_hybrid', label: 'Plug-in Hybrid' },
    { value: 'hydrogen', label: 'Hydrogen' },
    { value: 'lpg', label: 'LPG' },
    { value: 'cng', label: 'CNG' },
];

const TRANSMISSION_TYPES = [
    { value: 'manual', label: 'Manual' },
    { value: 'automatic', label: 'Automatic' },
];

const COMPLIANCE_STATUSES = [
    { value: 'compliant', label: 'Compliant' },
    { value: 'non_compliant', label: 'Non-Compliant' },
    { value: 'exempt', label: 'Exempt' },
];

const TABS = [
    { id: 'basic', label: 'Basic Info', icon: Truck },
    { id: 'capacity', label: 'Capacity & Dimensions', icon: Ruler },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'features', label: 'Features', icon: Cog },
    { id: 'documents', label: 'Documents', icon: ImageIcon },
];

const initialFormData: CreateVehicleData = {
    registration: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    seats: 2,
    vehicle_type: '',
    vehicle_category: '',
    fuel_type: 'diesel',
    transmission: 'manual',
    color: '',
    payload_capacity_kg: 0,
    gross_vehicle_weight_kg: 0,
    max_length_m: null,
    load_volume_m3: 0,
    insurance_policy_number: '',
    insurance_expiry_date: '',
    has_tail_lift: false,
    has_tracking_device: false,
    has_dash_cam: false,
    additional_features: {},
    provider_id: '',
    primary_driver: '',
    is_active: true,
    is_available: true,
    location: null,
    last_location_update: '',
    primary_location: '',
    copy_of_log_book: '',
    copy_of_MOT: '',
    V5_Document: '',
};

const AddEditVehiclePage: React.FC = () => {
    const navigate = useNavigate();
    const { vehicleId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams()
    const providerId = searchParams.get('providerId')

    const isEditing = !!vehicleId;

    console.log("the provider id", providerId)
    console.log("the provider id type", typeof providerId)
    console.log("the provider id value", providerId)
   
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [uploadedDocuments, setUploadedDocuments] = useState<{ [key: string]: File }>({});
    const { previewImages, setPreviewImages } = useImageUpload(existingImages);
    const [formData, setFormData] = useState<CreateVehicleData>({
        ...initialFormData,
        provider_id: typeof providerId === 'string' ? providerId : ''
    });

    const [vehicleTypes, setVehicleTypes] = useState<{value: string, label: string}[]>([]);
    const [vehicleCategories, setVehicleCategories] = useState<{value: string, label: string}[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<{value: string, label: string}[]>([]);
    const [providerDrivers, setProviderDrivers] = useState<{value: string, label: string}[]>([])
    const [error, setError] = useState<string>();

    const { data: vehicleTypesData, error: vehicleTypesError } = useSWR('/vehicle-types/', fetcher);
    const { data: vehicleCategoriesData, error: vehicleCategoriesError } = useSWR('/vehicle-categories/', fetcher);
    const { data: providerDriversData, error:  providerDriversDataError} = useSWR(
        providerId && typeof providerId === 'string' ? `/drivers/?provider=${providerId}` : null, 
        fetcher
    )
    


    useEffect(() => {
        if (vehicleTypesData) {
            setVehicleTypes(vehicleTypesData.map((type: any) => ({
                value: type.id, 
                label: type.name
            })));
        }
    }, [vehicleTypesData]);


    useEffect(() => {
        if (providerDriversData) {
            setProviderDrivers(providerDriversData.map((type: any) => ({
                value: type.id, 
                label: type.name
            })));
        }
      
    }, [providerDriversData]);

    useEffect(() => {
        if (vehicleCategoriesData) {
            const allCategories = vehicleCategoriesData.map((category: any) => ({
                value: category.id, 
                label: category.name,
                type: category.type
            }));
            setVehicleCategories(allCategories);
            
            // Filter categories based on selected vehicle type
            if (formData.vehicle_type) {
                const filtered = allCategories.filter((category: any) => 
                    category.type.id === formData.vehicle_type
                );
                setFilteredCategories(filtered);
            } else {
                setFilteredCategories([]);
            }
        }
    }, [vehicleCategoriesData, formData.vehicle_type]);

    // Fetch vehicle data if editing
    useEffect(() => {
        if (isEditing && vehicleId) {
            fetchVehicleData();
        }
    }, [vehicleId, isEditing]);

    const fetchVehicleData = async () => {
        try {
            setLoading(true);
            const vehicle = await vehicleService.getVehicle(vehicleId!);
            setFormData({
                ...vehicle,
                provider_id: typeof providerId === 'string' ? providerId : '',
                vehicle_type: vehicle.vehicle_type?.id || '',
                vehicle_category: vehicle.vehicle_category?.id || '',
                primary_driver: vehicle.primary_driver?.id || '',
                primary_location: vehicle.primary_location || '',
                insurance_expiry_date: vehicle.insurance_expiry_date ? vehicle.insurance_expiry_date.split('T')[0] : '',
                max_length_m: vehicle.max_length_m,
            });
            setExistingImages(vehicle.images || []);
            setPreviewImages(vehicle.images || []);
            console.log("the vehicle data", vehicle)
        } catch (error) {
            console.error('Error fetching vehicle:', error);
            showMessage('error', 'Failed to fetch vehicle data');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
        }));
        
        // Clear vehicle category when vehicle type changes
        if (name === 'vehicle_type') {
            setFormData((prev) => ({
                ...prev,
                vehicle_category: ''
            }));
        }
    };

    const handleSelectChange = (name: string, selectedOption: any) => {
        setFormData((prev) => ({
            ...prev,
            [name]: selectedOption?.value || '',
        }));
    };

    const handleAddressSelect = (address: {
        formatted_address: string;
        coordinates: { lat: number; lng: number };
        components: {
            address_line1: string;
            city: string;
            county: string;
            postcode: string;
            country: string;
        };
    }) => {
        setFormData((prev) => ({
            ...prev,
            primary_location: {
                address: address.formatted_address,
                coordinates: address.coordinates,
                components: address.components
            }
        }));
    };

    const handleAddressChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            primary_location: typeof prev.primary_location === 'string' 
                ? value 
                : {
                    ...(prev.primary_location as any),
                    address: value
                }
        }));
    };

    const calculateVolume = () => {
        const { max_length_m } = formData;
        if (max_length_m) {
            const volume = max_length_m * max_length_m * max_length_m;
            setFormData((prev) => ({ ...prev, load_volume_m3: parseFloat(volume.toFixed(2)) }));
        }
    };

    useEffect(() => {
        calculateVolume();
    }, [formData.max_length_m]);

    const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            console.log('Raw files selected:', e.target.files);
            console.log('Files array:', files);
            setUploadedImages((prev) => {
                const newImages = [...prev, ...files];
                console.log('Updated uploadedImages state:', newImages);
                return newImages;
            });
            console.log('Images uploaded:', files);
        }
    };

    const handleDocumentUploadChange = (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploadedDocuments((prev) => ({
                ...prev,
                [documentType]: file
            }));
            console.log('the docs',  file)
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImages = [...(formData.images || [])];
        newImages.splice(index, 1);
        setFormData((prev) => ({ ...prev, images: newImages }));
        const newUploadedImages = [...uploadedImages];
        newUploadedImages.splice(index, 1);
        setUploadedImages(newUploadedImages);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted!');
        console.log('Form data:', formData);
        console.log('Uploaded images:', uploadedImages);
        console.log('Uploaded documents:', uploadedDocuments);
        
        if (!formData.registration || !formData.make || !formData.model || !formData.vehicle_type || !providerId || typeof providerId !== 'string') {
            const missingFields = [];
            if (!formData.registration) missingFields.push('Registration Number');
            if (!formData.make) missingFields.push('Make');
            if (!formData.model) missingFields.push('Model');
            if (!formData.vehicle_type) missingFields.push('Vehicle Type');
            if (!providerId || typeof providerId !== 'string') missingFields.push('Provider ID');
            
            console.log('Missing fields:', missingFields);
            showMessage(`Please fill in the following required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }

        setLoading(true);
        try {
            console.log('Starting API call...');
            console.log('Is editing:', isEditing);
            console.log('Vehicle ID:', vehicleId);
            console.log('Provider ID:', providerId);
            console.log('Submitting with images:', uploadedImages.length);
            console.log('Submitting with documents:', Object.keys(uploadedDocuments).length);
            
            if (isEditing && vehicleId) {
                console.log("Updating vehicle with ID:", vehicleId);
                console.log("Form data for update:", formData);
                await vehicleService.updateVehicleWithImagesAndDocuments(vehicleId, formData, uploadedImages, uploadedDocuments);
                showMessage('Vehicle updated successfully!', 'success');
            } else {
                console.log('Creating new vehicle');
                console.log("Form data for create:", formData);
                await vehicleService.createVehicleWithImagesAndDocuments(formData, uploadedImages, uploadedDocuments);
                showMessage('Vehicle added successfully!', 'success');
            }
            console.log('API call completed successfully');
            navigate(-1);
        } catch (error) {
            console.error('Error saving vehicle:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response,
                status: error.response?.status,
                data: error.response?.data
            });
            showMessage( isEditing ? 'Failed to update vehicle' : 'Failed to add vehicle', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    if (loading && isEditing) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading vehicle data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleCancel}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center space-x-3">
                                {isEditing ? <Edit className="text-blue-500" /> : <Plus className="text-blue-500" />}
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
                                </h1>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <div className="flex space-x-1 p-4 overflow-x-auto">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {<tab.icon className="w-4 h-4" />}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information Tab */}
                            {activeTab === 'basic' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <IdCard className="mr-2 text-blue-500" />
                                            Registration Number *
                                        </label>
                                        <input
                                            type="text"
                                            name="registration"
                                            value={formData.registration}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="e.g., AB12 CDE"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Truck className="mr-2 text-blue-500" />
                                            Make *
                                        </label>
                                        <input
                                            type="text"
                                            name="make"
                                            value={formData.make}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="e.g., Ford"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Truck className="mr-2 text-blue-500" />
                                            Model *
                                        </label>
                                        <input
                                            type="text"
                                            name="model"
                                            value={formData.model}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="e.g., Transit"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Calendar className="mr-2 text-blue-500" />
                                            Year *
                                        </label>
                                        <input
                                            type="number"
                                            name="year"
                                            value={formData.year}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                            min="1980"
                                            max="2030"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Truck className="mr-2 text-blue-500" />
                                            Vehicle Type *
                                        </label>
                                        <select
                                            name="vehicle_type"
                                            value={formData.vehicle_type}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            required
                                        >
                                            <option value="">Select Vehicle Type</option>
                                            {vehicleTypes.map((type) => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Truck className="mr-2 text-blue-500" />
                                            Vehicle Category
                                        </label>
                                        <select
                                            name="vehicle_category"
                                            value={formData.vehicle_category}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            disabled={!formData.vehicle_type}
                                        >
                                            <option value="">{formData.vehicle_type ? 'Select Vehicle Category' : 'Select Vehicle Type First'}</option>
                                            {filteredCategories.map((category) => (
                                                <option key={category.value} value={category.value}>{category.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Fuel className="mr-2 text-blue-500" />
                                            Fuel Type
                                        </label>
                                        <select
                                            name="fuel_type"
                                            value={formData.fuel_type}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            {FUEL_TYPES.map((type) => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Cog className="mr-2 text-blue-500" />
                                            Transmission
                                        </label>
                                        <select
                                            name="transmission"
                                            value={formData.transmission}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            {TRANSMISSION_TYPES.map((type) => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Palette className="mr-2 text-blue-500" />
                                            Color
                                        </label>
                                        <input
                                            type="text"
                                            name="color"
                                            value={formData.color}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="e.g., White"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <MapPin className="mr-2 text-blue-500" />
                                            Location
                                        </label>
                                        <AddressAutocomplete
                                            onAddressSelect={handleAddressSelect}
                                            onAddressChange={handleAddressChange}
                                            placeholder="Enter vehicle location"
                                            value={
                                                typeof formData.primary_location === 'string' 
                                                    ? formData.primary_location 
                                                    : (typeof formData.primary_location === 'object' && formData.primary_location !== null 
                                                        ? (formData.primary_location as any).address || (formData.primary_location as any).name || ''
                                                        : '')
                                            }
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <User className="mr-2 text-blue-500" />
                                            Primary Driver
                                        </label>
                                        <Select
                                            name="primary_driver"
                                            value={providerDrivers.find(driver => driver.value === formData.primary_driver) || null}
                                            onChange={(selectedOption) => handleSelectChange('primary_driver', selectedOption)}
                                            options={providerDrivers}
                                            placeholder="Select Driver"
                                            isClearable
                                            className="w-full"
                                            classNamePrefix="react-select"
                                            styles={{
                                                control: (provided, state) => ({
                                                    ...provided,
                                                    minHeight: '48px',
                                                    border: state.isFocused ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                                    borderRadius: '12px',
                                                    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                                                    backgroundColor: '#ffffff',
                                                }),
                                                option: (provided, state) => ({
                                                    ...provided,
                                                    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'transparent',
                                                    color: state.isSelected ? '#ffffff' : '#374151',
                                                    cursor: 'pointer',
                                                }),
                                                menu: (provided) => ({
                                                    ...provided,
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                }),
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Capacity & Dimensions Tab */}
                            {activeTab === 'capacity' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Weight className="mr-2 text-green-500" />
                                            Payload Capacity (kg)
                                        </label>
                                        <input
                                            type="number"
                                            name="payload_capacity_kg"
                                            value={formData.payload_capacity_kg}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="e.g., 1000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Weight className="mr-2 text-green-500" />
                                            Gross Vehicle Weight (kg)
                                        </label>
                                        <input
                                            type="number"
                                            name="gross_vehicle_weight_kg"
                                            value={formData.gross_vehicle_weight_kg}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="e.g., 3500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Ruler className="mr-2 text-green-500" />
                                            Max Length (m)
                                        </label>
                                        <input
                                            type="number"
                                            name="max_length_m"
                                            value={formData.max_length_m || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="e.g., 10"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Ruler className="mr-2 text-green-500" />
                                            Load Volume (m³)
                                        </label>
                                        <input
                                            type="number"
                                            name="load_volume_m3"
                                            value={formData.load_volume_m3}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Auto-calculated"
                                            readOnly
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Automatically calculated from dimensions</p>
                                    </div>
                                </div>
                            )}

                            {/* Compliance Tab */}
                            {activeTab === 'compliance' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Calendar className="mr-2 text-orange-500" />
                                            Insurance Policy Number
                                        </label>
                                        <input
                                            type="text"
                                            name="insurance_policy_number"
                                            value={formData.insurance_policy_number}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Policy number"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Calendar className="mr-2 text-orange-500" />
                                            Insurance Expiry Date
                                        </label>
                                        <input
                                            type="date"
                                            name="insurance_expiry_date"
                                            value={formData.insurance_expiry_date}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Features Tab */}
                            {activeTab === 'features' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="has_tail_lift"
                                                checked={formData.has_tail_lift}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Has Tail Lift</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="has_tracking_device"
                                                checked={formData.has_tracking_device}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Has Tracking Device</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="has_dash_cam"
                                                checked={formData.has_dash_cam}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Has Dash Cam</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="is_active"
                                                checked={formData.is_active}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Active in Fleet</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="is_available"
                                                checked={formData.is_available}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Available for Jobs</label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Documents Tab */}
                            {activeTab === 'documents' && (
                                <div className="space-y-6">
                                    {/* Vehicle Photos */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                            <ImageIcon className="w-5 h-5 mr-2 text-blue-500" />
                                            Vehicle Photos
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Upload Vehicle Photos
                                                </label>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={handleImageUploadChange}
                                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Upload up to 5 photos of the vehicle
                                                </p>
                                            </div>
                                            {uploadedImages.length > 0 && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Selected Photos ({uploadedImages.length})
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {uploadedImages.map((file, index) => (
                                                            <div key={index} className="relative">
                                                                <img
                                                                    src={URL.createObjectURL(file)}
                                                                    alt={`Preview ${index + 1}`}
                                                                    className="w-full h-20 object-cover rounded-lg"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newImages = [...uploadedImages];
                                                                        newImages.splice(index, 1);
                                                                        setUploadedImages(newImages);
                                                                    }}
                                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Vehicle Documents */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                            <FileText className="w-5 h-5 mr-2 text-blue-500" />
                                            Vehicle Documents
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                <ImageIcon className="mr-2 text-blue-500" />
                                                Copy of Log Book
                                            </label>
                                            <input
                                                type="file"
                                                name="copy_of_log_book"
                                                accept="image/*,.pdf,.doc,.docx"
                                                onChange={(e) => handleDocumentUploadChange(e, 'log_book')}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                <ImageIcon className="mr-2 text-blue-500" />
                                                Copy of MOT
                                            </label>
                                            <input
                                                type="file"
                                                name="copy_of_MOT"
                                                accept="image/*,.pdf,.doc,.docx"
                                                onChange={(e) => handleDocumentUploadChange(e, 'mot')}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                <ImageIcon className="mr-2 text-blue-500" />
                                                V5 Document
                                            </label>
                                            <input
                                                type="file"
                                                name="V5_Document"
                                                accept="image/*,.pdf,.doc,.docx"
                                                onChange={(e) => handleDocumentUploadChange(e, 'v5_document')}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 btn btn-outline-warning bg-gradient-to-r  font-medium rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    {isEditing ? 'Updating...' : 'Adding...'}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {isEditing ? <Edit  /> : <Plus />}
                                    {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddEditVehiclePage; 