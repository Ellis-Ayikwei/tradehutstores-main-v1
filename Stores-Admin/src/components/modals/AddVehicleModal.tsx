import { Dialog } from '@headlessui/react';
import { Calendar, Cog, Edit, Fuel, IdCard, Image as ImageIcon, Palette, Plus, Ruler, Shield, Truck, User, Weight, Wrench, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';
import axiosInstance from '../../services/axiosInstance';
import fetcher from '../../services/fetcher';
import showMessage from '../../helper/showMessage';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTruck, faIdCard, faCalendarAlt, faCog, faGasPump, faRuler, faWeightHanging } from '@fortawesome/free-solid-svg-icons';
import { Vehicle } from '../../types/vehicle';
import { addVehicle } from '../../store/slices/vehicleSlice';
import { RootState } from '../../store';

interface Vehicle {
    id?: string;
    registration: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    vehicle_type: string;
    fuel_type: string;
    transmission: string;
    color: string;
    payload_capacity_kg: number;
    gross_vehicle_weight_kg: number;
    load_length_mm: number;
    load_width_mm: number;
    load_height_mm: number;
    load_volume_m3: number;
    mot_expiry_date: string;
    road_tax_expiry_date: string;
    has_tachograph: boolean;
    ulez_compliant: boolean;
    clean_air_zone_status: string;
    insurance_policy_number: string;
    insurance_expiry_date: string;
    fleet_number: string;
    last_service_date: string;
    next_service_date: string;
    last_service_mileage: number;
    current_mileage: number;
    service_interval_months: number;
    service_interval_miles: number;
    has_tail_lift: boolean;
    has_refrigeration: boolean;
    has_tracking_device: boolean;
    has_dash_cam: boolean;
    additional_features: any;
    primary_driver_id?: string;
    is_active: boolean;
    is_available: boolean;
    images?: string[];
    seats: number;
    max_length_m: number | null;
    location: string | null;
    last_location_update: string;
    primary_location: string;
    copy_of_log_book: string | null;
    copy_of_MOT: string | null;
    V5_Document: string | null;
}

interface AddVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle?: Vehicle | null;
    providerId?: string;
    onVehicleAdded?: () => void;
    onVehicleUpdated?: () => void;
}

const VEHICLE_TYPES = [
    { value: 'small_van', label: 'Small Van (up to 2.5t)' },
    { value: 'medium_van', label: 'Medium Van (2.5-3.5t)' },
    { value: 'large_van', label: 'Large Van (3.5t)' },
    { value: 'luton', label: 'Luton Van' },
    { value: '7.5t', label: '7.5 Tonne Truck' },
    { value: '18t', label: '18 Tonne Truck' },
    { value: 'refrigerated', label: 'Refrigerated Vehicle' },
    { value: 'flatbed', label: 'Flatbed Truck' },
    { value: 'tipper', label: 'Tipper Truck' },
    { value: 'curtain_sider', label: 'Curtain Sider' },
    { value: 'dropside', label: 'Dropside Truck' },
    { value: 'tail_lift', label: 'Tail Lift Van' },
    { value: 'pickup', label: 'Pickup Truck' },
    { value: 'cargo_bike', label: 'Cargo Bike' },
    { value: 'other', label: 'Other Specialized Vehicle' },
];

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

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ isOpen, onClose, vehicle, providerId, onVehicleAdded, onVehicleUpdated }) => {
    const isEditing = !!vehicle?.id;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>(vehicle?.images || []);

    // Image upload hook
    const { previewImages, handleImageUpload, removeImage, setPreviewImages } = useImageUpload(existingImages);

    // Form state
    const initialFormData: Partial<Vehicle> = {
        registration: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        seats: 2,
        vehicle_type: '',
        fuel_type: 'diesel',
        transmission: 'manual',
        color: '',
        payload_capacity_kg: 0,
        gross_vehicle_weight_kg: 0,
        max_length_m: null,
        load_volume_m3: 0,
        insurance_policy_number: '',
        insurance_expiry_date: '',
        fleet_number: '',
        has_tail_lift: false,
        has_tracking_device: false,
        has_dash_cam: false,
        additional_features: {},
        provider: providerId || '',
        primary_driver: '',
        is_active: true,
        is_available: true,
        location: null,
        last_location_update: '',
        primary_location: '',
        copy_of_log_book: null,
        copy_of_MOT: null,
        V5_Document: null,
        images: [],
    };

    const [formData, setFormData] = useState<Partial<Vehicle>>(initialFormData);

    // Fetch drivers for assignment
    const { data: driversData, isLoading: driversLoading } = useSWR('drivers/', fetcher);

    // Initialize form when vehicle changes
    useEffect(() => {
        if (vehicle) {
            setFormData({
                ...vehicle,
                mot_expiry_date: vehicle.mot_expiry_date ? vehicle.mot_expiry_date.split('T')[0] : '',
                road_tax_expiry_date: vehicle.road_tax_expiry_date ? vehicle.road_tax_expiry_date.split('T')[0] : '',
                insurance_expiry_date: vehicle.insurance_expiry_date ? vehicle.insurance_expiry_date.split('T')[0] : '',
                last_service_date: vehicle.last_service_date ? vehicle.last_service_date.split('T')[0] : '',
                next_service_date: vehicle.next_service_date ? vehicle.next_service_date.split('T')[0] : '',
            });
            setExistingImages(vehicle.images || []);
            setPreviewImages(vehicle.images || []);
        } else {
            setFormData(initialFormData);
            setExistingImages([]);
            setPreviewImages([]);
        }
    }, [vehicle, setPreviewImages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const calculateVolume = () => {
        const { max_length_m } = formData;
        if (max_length_m) {
            const volume = max_length_m * max_length_m * max_length_m; // Convert to m³
            setFormData((prev) => ({ ...prev, load_volume_m3: parseFloat(volume.toFixed(2)) }));
        }
    };

    useEffect(() => {
        calculateVolume();
    }, [formData.max_length_m]);

    const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setUploadedImages((prev) => [...prev, ...files]);

            // Update form data with new images
            const newImageUrls = files.map((file) => URL.createObjectURL(file));
            setFormData((prev) => ({
                ...prev,
                images: [...(prev.images || []), ...newImageUrls],
            }));
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

        // Basic validation
        if (!formData.registration || !formData.make || !formData.model || !formData.vehicle_type) {
            showMessage('error', 'Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            // Create FormData for file upload
            const submitData = new FormData();

            // Add all form fields
            Object.keys(formData).forEach((key) => {
                if (key !== 'images') {
                    const value = formData[key as keyof Vehicle];
                    if (value !== undefined && value !== null) {
                        if (typeof value === 'object') {
                            submitData.append(key, JSON.stringify(value));
                        } else {
                            submitData.append(key, String(value));
                        }
                    }
                }
            });

            // Add provider ID if provided
            if (providerId) {
                submitData.append('providerId', providerId);
            }

            // Add uploaded images
            uploadedImages.forEach((file, index) => {
                submitData.append(`images`, file);
            });

            // Add existing image URLs
            if (existingImages.length > 0) {
                submitData.append('existing_images', JSON.stringify(existingImages));
            }

            let response;
            if (isEditing && vehicle?.id) {
                response = await axiosInstance.patch(`/vehicles/${vehicle.id}/`, submitData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                showMessage('success', 'Vehicle updated successfully!');
                onVehicleUpdated?.();
            } else {
                response = await axiosInstance.post('/vehicles/', submitData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                showMessage('success', 'Vehicle added successfully!');
                onVehicleAdded?.();
            }

            if (response.status === 200 || response.status === 201) {
                handleClose();
            }
        } catch (error) {
            console.error('Error saving vehicle:', error);
            showMessage('error', isEditing ? 'Failed to update vehicle' : 'Failed to add vehicle');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData(initialFormData);
        setActiveTab('basic');
        setIsSubmitting(false);
        setUploadedImages([]);
        setExistingImages([]);
        setPreviewImages([]);
        onClose();
    };

    const TABS = [
        { id: 'basic', label: 'Basic Info', icon: Truck },
        { id: 'capacity', label: 'Capacity & Dimensions', icon: Ruler },
        { id: 'compliance', label: 'Compliance', icon: Shield },
        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
        { id: 'features', label: 'Features', icon: Cog },
        { id: 'images', label: 'Images', icon: ImageIcon },
    ];

    const modalContent = (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[9999]">
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {isEditing ? <Edit className="text-blue-500" /> : <Plus className="text-blue-500" />}
                            {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
                        </Dialog.Title>
                        <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <div className="flex space-x-1 p-4">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
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
                    <div className="p-6 overflow-y-auto max-h-[60vh]">
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
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                            {VEHICLE_TYPES.map((type) => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
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
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
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
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
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
                                            <IdCard className="mr-2 text-blue-500" />
                                            Fleet Number
                                        </label>
                                        <input
                                            type="text"
                                            name="fleet_number"
                                            value={formData.fleet_number}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Internal fleet ID"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <User className="mr-2 text-blue-500" />
                                            Primary Driver
                                        </label>
                                        <select
                                            name="primary_driver_id"
                                            value={formData.primary_driver_id || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Select Driver</option>
                                            {driversData?.map((driver: any) => (
                                                <option key={driver.id} value={driver.id}>
                                                    {driver.user?.first_name} {driver.user?.last_name} - {driver.license_number}
                                                </option>
                                            ))}
                                        </select>
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

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Shield className="mr-2 text-orange-500" />
                                            Clean Air Zone Status
                                        </label>
                                        <select
                                            name="clean_air_zone_status"
                                            value={formData.clean_air_zone_status}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            {COMPLIANCE_STATUSES.map((status) => (
                                                <option key={status.value} value={status.value}>
                                                    {status.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="space-y-4">
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
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Maintenance Tab */}
                            {activeTab === 'maintenance' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Calendar className="mr-2 text-purple-500" />
                                            Last Service Date
                                        </label>
                                        <input
                                            type="date"
                                            name="last_service_date"
                                            value={formData.last_service_date}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Calendar className="mr-2 text-purple-500" />
                                            Next Service Date
                                        </label>
                                        <input
                                            type="date"
                                            name="next_service_date"
                                            value={formData.next_service_date}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Truck className="mr-2 text-purple-500" />
                                            Current Mileage
                                        </label>
                                        <input
                                            type="number"
                                            name="current_mileage"
                                            value={formData.current_mileage}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="e.g., 55000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Calendar className="mr-2 text-purple-500" />
                                            Service Interval (months)
                                        </label>
                                        <input
                                            type="number"
                                            name="service_interval_months"
                                            value={formData.service_interval_months}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="e.g., 12"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <Truck className="mr-2 text-purple-500" />
                                            Service Interval (miles)
                                        </label>
                                        <input
                                            type="number"
                                            name="service_interval_miles"
                                            value={formData.service_interval_miles}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="e.g., 12000"
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
                                                name="has_refrigeration"
                                                checked={formData.has_refrigeration}
                                                onChange={handleInputChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Has Refrigeration</label>
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

                            {/* Images Tab */}
                            {activeTab === 'images' && (
                                <div className="space-y-6">
                                    {/* Image Upload Area */}
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-400 transition-colors">
                                        <input type="file" multiple accept="image/*" onChange={handleImageUploadChange} className="hidden" id="image-upload" />
                                        <label htmlFor="image-upload" className="cursor-pointer block">
                                            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                                            <div className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Vehicle Images</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click to select or drag and drop images here</div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500">Supports: JPG, PNG, GIF (Max 5MB each)</div>
                                        </label>
                                    </div>

                                    {/* Image Preview Grid */}
                                    {previewImages.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Vehicle Images ({previewImages.length})</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {previewImages.map((image, index) => (
                                                    <div key={index} className="relative group">
                                                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                            <img src={image} alt={`Vehicle image ${index + 1}`} className="w-full h-full object-cover" />
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleRemoveImage(index);
                                                            }}
                                                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                            title="Remove image"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                                            <p className="text-white text-xs">Image {index + 1}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No Images State */}
                                    {previewImages.length === 0 && (
                                        <div className="text-center py-8">
                                            <ImageIcon className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400">No images uploaded yet. Upload images to showcase your vehicle.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    {isEditing ? 'Updating...' : 'Adding...'}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {isEditing ? <Edit className="text-blue-500" /> : <Plus className="text-blue-500" />}
                                    {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
                                </div>
                            )}
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );

    return isOpen ? createPortal(modalContent, document.body) : null;
};

export default AddVehicleModal;
