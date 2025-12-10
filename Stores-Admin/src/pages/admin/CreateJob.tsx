import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IconArrowLeft,
    IconPackage,
    IconMapPin,
    IconCalendar,
    IconClock,
    IconCurrencyDollar,
    IconTruck,
    IconUser,
    IconFileText,
    IconSettings,
    IconCheck,
    IconAlertTriangle,
    IconPlus,
    IconX,
    IconGavel,
    IconBolt,
    IconShield,
    IconWeight,
    IconRuler,
    IconPhoto,
    IconUpload,
    IconTrash,
    IconDeviceFloppy,
    IconLoader,
    IconSearch,
    IconFilter,
} from '@tabler/icons-react';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';
import AddressAutocomplete from '../../components/AddressAutocomplete';

interface Booking {
    id: string;
    tracking_number: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    pickup_location: string;
    delivery_location: string;
    items_description: string;
    total_weight: number | null;
    base_price: number | null;
    final_price: number | null;
    status: string;
    payment_status: 'paid' | 'pending' | 'refunded' | 'partial';
    service_type: string;
    preferred_pickup_date: string;
    preferred_pickup_time: string | null;
    preferred_delivery_date: string | null;
    preferred_delivery_time: string | null;
    is_flexible: boolean;
    requires_special_handling: boolean;
    special_instructions: string;
    insurance_required: boolean;
    insurance_value: number | null;
    created_at: string;
    updated_at: string;
}

interface CreateJobFormData {
    // Basic Information
    title: string;
    description: string;
    is_instant: boolean;
    status: 'draft' | 'pending' | 'bidding' | 'accepted' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
    
    // Request Information (will be linked to existing booking)
    request_id: string;
    
    // Pricing
    price: number | null;
    minimum_bid: number | null;
    
    // Bidding Configuration
    bidding_end_time: string | null;
    bidding_duration_hours: number;
    
    // Vehicle and Qualifications
    preferred_vehicle_types: string[];
    required_qualifications: string[];
    
    // Notes
    notes: string;
    
    // Location Information (from booking)
    pickup_location: string;
    delivery_location: string;
    
    // Items Information
    items_description: string;
    total_weight: number | null;
    dimensions: {
        length: number;
        width: number;
        height: number;
    } | null;
    
    // Special Requirements
    requires_special_handling: boolean;
    special_instructions: string;
    insurance_required: boolean;
    insurance_value: number | null;
    
    // Timing
    preferred_pickup_date: string;
    preferred_pickup_time: string;
    preferred_delivery_date: string;
    preferred_delivery_time: string;
    is_flexible: boolean;
    
    // Contact Information (from booking)
    contact_name: string;
    contact_phone: string;
    contact_email: string;
}

const CreateJob: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

    // Fetch all bookings
    const { data: allBookings, isLoading: bookingsLoading } = useSWR<Booking[]>('requests/', fetcher);
    
    // Fetch existing jobs to check which bookings already have jobs
    const { data: existingJobs } = useSWR<{ request_id: string }[]>('jobs/', fetcher);

    // Filter bookings that don't have jobs yet and match search/filter criteria
    const availableBookings = allBookings?.filter(booking => {
        // Check if booking already has a job
        const hasJob = existingJobs?.some(job => job.request_id === booking.id);
        
        // Only show bookings that don't have jobs yet
        if (hasJob) return false;
        
        // Filter by payment status
        if (paymentStatusFilter !== 'all' && booking.payment_status !== paymentStatusFilter) {
            return false;
        }
        
        // Filter by search term
        if (searchTerm.trim() !== '') {
            const searchLower = searchTerm.toLowerCase();
            return (
                booking.tracking_number.toLowerCase().includes(searchLower) ||
                booking.contact_name.toLowerCase().includes(searchLower) ||
                booking.pickup_location.toLowerCase().includes(searchLower) ||
                booking.delivery_location.toLowerCase().includes(searchLower) ||
                booking.items_description.toLowerCase().includes(searchLower)
            );
        }
        
        return true;
    }) || [];

    const [formData, setFormData] = useState<CreateJobFormData>({
        title: '',
        description: '',
        is_instant: false,
        status: 'draft',
        request_id: '',
        price: null,
        minimum_bid: null,
        bidding_end_time: null,
        bidding_duration_hours: 24,
        preferred_vehicle_types: [],
        required_qualifications: [],
        notes: '',
        pickup_location: '',
        delivery_location: '',
        items_description: '',
        total_weight: null,
        dimensions: null,
        requires_special_handling: false,
        special_instructions: '',
        insurance_required: false,
        insurance_value: null,
        preferred_pickup_date: '',
        preferred_pickup_time: '',
        preferred_delivery_date: '',
        preferred_delivery_time: '',
        is_flexible: false,
        contact_name: '',
        contact_phone: '',
        contact_email: '',
    });

    const vehicleTypes = [
        'small_van',
        'large_van',
        'truck',
        'large_truck',
        'specialized',
        'refrigerated',
        'flatbed',
        'box_truck',
    ];

    const qualifications = [
        'fragile_handling',
        'piano_moving',
        'office_equipment',
        'residential_move',
        'commercial_move',
        'heavy_lifting',
        'specialized_equipment',
        'international_shipping',
        'storage_services',
        'packing_services',
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({
                ...prev,
                [name]: checked,
            }));
        } else if (type === 'number') {
            setFormData(prev => ({
                ...prev,
                [name]: value === '' ? null : parseFloat(value),
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleBookingSelect = (booking: Booking) => {
        setSelectedBooking(booking);
        setFormData(prev => ({
            ...prev,
            request_id: booking.id,
            contact_name: booking.contact_name,
            contact_phone: booking.contact_phone,
            contact_email: booking.contact_email,
            pickup_location: booking.pickup_location,
            delivery_location: booking.delivery_location,
            items_description: booking.items_description,
            total_weight: booking.total_weight,
            price: booking.final_price || booking.base_price,
            minimum_bid: booking.base_price ? booking.base_price * 0.8 : null,
            requires_special_handling: booking.requires_special_handling,
            special_instructions: booking.special_instructions,
            insurance_required: booking.insurance_required,
            insurance_value: booking.insurance_value,
            preferred_pickup_date: booking.preferred_pickup_date,
            preferred_pickup_time: booking.preferred_pickup_time || '',
            preferred_delivery_date: booking.preferred_delivery_date || '',
            preferred_delivery_time: booking.preferred_delivery_time || '',
            is_flexible: booking.is_flexible,
            // Generate title and description from booking
            title: `Moving Service - ${booking.tracking_number}`,
            description: `Moving service job created from booking ${booking.tracking_number}. ${booking.items_description}`,
        }));
    };

    const handleVehicleTypeToggle = (vehicleType: string) => {
        setFormData(prev => ({
            ...prev,
            preferred_vehicle_types: prev.preferred_vehicle_types.includes(vehicleType)
                ? prev.preferred_vehicle_types.filter(vt => vt !== vehicleType)
                : [...prev.preferred_vehicle_types, vehicleType],
        }));
    };

    const handleQualificationToggle = (qualification: string) => {
        setFormData(prev => ({
            ...prev,
            required_qualifications: prev.required_qualifications.includes(qualification)
                ? prev.required_qualifications.filter(q => q !== qualification)
                : [...prev.required_qualifications, qualification],
        }));
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setUploadedPhotos(prev => [...prev, ...files]);
    };

    const removePhoto = (index: number) => {
        setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        switch (step) {
            case 1:
                if (!formData.request_id) {
                    newErrors.request_id = 'Please select a booking';
                }
                if (!formData.title.trim()) {
                    newErrors.title = 'Job title is required';
                }
                if (!formData.description.trim()) {
                    newErrors.description = 'Job description is required';
                }
                break;

            case 2:
                if (!formData.pickup_location.trim()) {
                    newErrors.pickup_location = 'Pickup location is required';
                }
                if (!formData.delivery_location.trim()) {
                    newErrors.delivery_location = 'Delivery location is required';
                }
                if (!formData.preferred_pickup_date) {
                    newErrors.preferred_pickup_date = 'Preferred pickup date is required';
                }
                if (!formData.preferred_pickup_time) {
                    newErrors.preferred_pickup_time = 'Preferred pickup time is required';
                }
                break;

            case 3:
                if (formData.preferred_vehicle_types.length === 0) {
                    newErrors.preferred_vehicle_types = 'At least one vehicle type is required';
                }
                if (formData.required_qualifications.length === 0) {
                    newErrors.required_qualifications = 'At least one qualification is required';
                }
                break;

            case 4:
                if (!formData.is_instant && !formData.minimum_bid) {
                    newErrors.minimum_bid = 'Minimum bid is required for bidding jobs';
                }
                if (formData.is_instant && !formData.price) {
                    newErrors.price = 'Price is required for instant jobs';
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 4));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateStep(currentStep)) {
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            // Prepare the job data
            const jobData = {
                ...formData,
                // Calculate bidding end time if it's a bidding job
                bidding_end_time: formData.is_instant ? null : 
                    new Date(Date.now() + formData.bidding_duration_hours * 60 * 60 * 1000).toISOString(),
            };

            // Make API call to create job
            const response = await fetch('/api/jobs/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jobData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create job');
            }

            const createdJob = await response.json();
            setSuccessMessage('Job created successfully!');
            
            // Redirect to job management after a short delay
            setTimeout(() => {
                navigate('/admin/jobs');
            }, 2000);

        } catch (error: any) {
            setErrors({ submit: error.message || 'An error occurred while creating the job' });
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Booking</h3>
                
                {/* Search and Filter */}
                <div className="mb-6 space-y-4">
                    <div className="relative">
                        <IconSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search bookings by tracking number, customer, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                        />
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Payment Status
                            </label>
                            <select
                                value={paymentStatusFilter}
                                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="all">All Payment Statuses</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="partial">Partial</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Booking Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Booking to Create Job From *
                    </label>
                    {bookingsLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <IconLoader className="w-6 h-6 animate-spin text-emerald-500" />
                            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading bookings...</span>
                        </div>
                    ) : availableBookings.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                            <IconPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Available Bookings</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {searchTerm || paymentStatusFilter !== 'all' 
                                    ? 'No bookings match your search criteria or all matching bookings already have jobs.'
                                    : 'All bookings have already been converted to jobs.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                            {availableBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    onClick={() => handleBookingSelect(booking)}
                                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                                        selectedBooking?.id === booking.id
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {booking.tracking_number}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                booking.payment_status === 'paid' 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : booking.payment_status === 'partial'
                                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                                {booking.payment_status}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(booking.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <IconUser className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-900 dark:text-white">{booking.contact_name}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-sm">
                                            <IconMapPin className="w-4 h-4 text-emerald-500" />
                                            <span className="text-gray-600 dark:text-gray-400 truncate">
                                                {booking.pickup_location}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-sm">
                                            <IconMapPin className="w-4 h-4 text-red-500" />
                                            <span className="text-gray-600 dark:text-gray-400 truncate">
                                                {booking.delivery_location}
                                            </span>
                                        </div>
                                        
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Service:</span> {booking.service_type}
                                        </div>
                                        
                                        {booking.base_price && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                <span className="font-medium">Base Price:</span> £{booking.base_price}
                                            </div>
                                        )}
                                        
                                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                            {booking.items_description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {errors.request_id && (
                        <p className="text-red-500 text-sm mt-1">{errors.request_id}</p>
                    )}
                </div>

                {/* Job Title */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Job Title *
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white ${
                            errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                        placeholder="Enter job title"
                    />
                    {errors.title && (
                        <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                    )}
                </div>

                {/* Job Description */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Job Description *
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white ${
                            errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                        placeholder="Describe the job requirements and details"
                    />
                    {errors.description && (
                        <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                    )}
                </div>

                {/* Job Type */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Job Type
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="is_instant"
                                checked={formData.is_instant}
                                onChange={() => setFormData(prev => ({ ...prev, is_instant: true }))}
                                className="mr-2"
                            />
                            <span className="text-sm">Instant Job</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="is_instant"
                                checked={!formData.is_instant}
                                onChange={() => setFormData(prev => ({ ...prev, is_instant: false }))}
                                className="mr-2"
                            />
                            <span className="text-sm">Bidding Job</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location & Timing</h3>
                
                {/* Pickup Location */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pickup Location *
                    </label>
                    <AddressAutocomplete
                        name="pickup_location"
                        value={formData.pickup_location}
                        onChange={(value) => setFormData(prev => ({ ...prev, pickup_location: value }))}
                        placeholder="Enter pickup address"
                        error={errors.pickup_location}
                    />
                </div>

                {/* Delivery Location */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Delivery Location *
                    </label>
                    <AddressAutocomplete
                        name="delivery_location"
                        value={formData.delivery_location}
                        onChange={(value) => setFormData(prev => ({ ...prev, delivery_location: value }))}
                        placeholder="Enter delivery address"
                        error={errors.delivery_location}
                    />
                </div>

                {/* Pickup Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Preferred Pickup Date *
                        </label>
                        <input
                            type="date"
                            name="preferred_pickup_date"
                            value={formData.preferred_pickup_date}
                            onChange={handleInputChange}
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white ${
                                errors.preferred_pickup_date ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                            }`}
                        />
                        {errors.preferred_pickup_date && (
                            <p className="text-red-500 text-sm mt-1">{errors.preferred_pickup_date}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Preferred Pickup Time *
                        </label>
                        <input
                            type="time"
                            name="preferred_pickup_time"
                            value={formData.preferred_pickup_time}
                            onChange={handleInputChange}
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white ${
                                errors.preferred_pickup_time ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                            }`}
                        />
                        {errors.preferred_pickup_time && (
                            <p className="text-red-500 text-sm mt-1">{errors.preferred_pickup_time}</p>
                        )}
                    </div>
                </div>

                {/* Delivery Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Preferred Delivery Date
                        </label>
                        <input
                            type="date"
                            name="preferred_delivery_date"
                            value={formData.preferred_delivery_date}
                            onChange={handleInputChange}
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Preferred Delivery Time
                        </label>
                        <input
                            type="time"
                            name="preferred_delivery_time"
                            value={formData.preferred_delivery_time}
                            onChange={handleInputChange}
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>

                {/* Flexible Timing */}
                <div className="mb-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="is_flexible"
                            checked={formData.is_flexible}
                            onChange={handleInputChange}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Flexible with timing
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requirements & Specifications</h3>
                
                {/* Vehicle Types */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preferred Vehicle Types *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {vehicleTypes.map((vehicleType) => (
                            <label
                                key={vehicleType}
                                className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${
                                    formData.preferred_vehicle_types.includes(vehicleType)
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.preferred_vehicle_types.includes(vehicleType)}
                                    onChange={() => handleVehicleTypeToggle(vehicleType)}
                                    className="mr-2"
                                />
                                <span className="text-sm capitalize">{vehicleType.replace('_', ' ')}</span>
                            </label>
                        ))}
                    </div>
                    {errors.preferred_vehicle_types && (
                        <p className="text-red-500 text-sm mt-1">{errors.preferred_vehicle_types}</p>
                    )}
                </div>

                {/* Required Qualifications */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Required Qualifications *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {qualifications.map((qualification) => (
                            <label
                                key={qualification}
                                className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${
                                    formData.required_qualifications.includes(qualification)
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={formData.required_qualifications.includes(qualification)}
                                    onChange={() => handleQualificationToggle(qualification)}
                                    className="mr-2"
                                />
                                <span className="text-sm capitalize">{qualification.replace('_', ' ')}</span>
                            </label>
                        ))}
                    </div>
                    {errors.required_qualifications && (
                        <p className="text-red-500 text-sm mt-1">{errors.required_qualifications}</p>
                    )}
                </div>

                {/* Special Requirements */}
                <div className="mb-4">
                    <label className="flex items-center mb-2">
                        <input
                            type="checkbox"
                            name="requires_special_handling"
                            checked={formData.requires_special_handling}
                            onChange={handleInputChange}
                            className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Requires Special Handling
                        </span>
                    </label>
                    {formData.requires_special_handling && (
                        <textarea
                            name="special_instructions"
                            value={formData.special_instructions}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Describe special handling requirements..."
                        />
                    )}
                </div>

                {/* Insurance */}
                <div className="mb-4">
                    <label className="flex items-center mb-2">
                        <input
                            type="checkbox"
                            name="insurance_required"
                            checked={formData.insurance_required}
                            onChange={handleInputChange}
                            className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Insurance Required
                        </span>
                    </label>
                    {formData.insurance_required && (
                        <input
                            type="number"
                            name="insurance_value"
                            value={formData.insurance_value || ''}
                            onChange={handleInputChange}
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Insurance value in GBP"
                        />
                    )}
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing & Final Details</h3>
                
                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {formData.is_instant ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Fixed Price (GBP) *
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price || ''}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white ${
                                    errors.price ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                                }`}
                                placeholder="0.00"
                            />
                            {errors.price && (
                                <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Minimum Bid (GBP) *
                                </label>
                                <input
                                    type="number"
                                    name="minimum_bid"
                                    value={formData.minimum_bid || ''}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    min="0"
                                    className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white ${
                                        errors.minimum_bid ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                                    }`}
                                    placeholder="0.00"
                                />
                                {errors.minimum_bid && (
                                    <p className="text-red-500 text-sm mt-1">{errors.minimum_bid}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bidding Duration (hours)
                                </label>
                                <input
                                    type="number"
                                    name="bidding_duration_hours"
                                    value={formData.bidding_duration_hours}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="168"
                                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Notes */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Additional Notes
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Any additional notes or special instructions..."
                    />
                </div>

                {/* Photo Upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Upload Photos
                    </label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            id="photo-upload"
                        />
                        <label htmlFor="photo-upload" className="cursor-pointer">
                            <IconUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Click to upload photos or drag and drop
                            </p>
                        </label>
                    </div>
                    
                    {/* Display uploaded photos */}
                    {uploadedPhotos.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {uploadedPhotos.map((photo, index) => (
                                <div key={index} className="relative">
                                    <img
                                        src={URL.createObjectURL(photo)}
                                        alt={`Upload ${index + 1}`}
                                        className="w-full h-24 object-cover rounded-lg"
                                    />
                                    <button
                                        onClick={() => removePhoto(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <IconX className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            case 3:
                return renderStep3();
            case 4:
                return renderStep4();
            default:
                return null;
        }
    };

    const steps = [
        { number: 1, title: 'Select Booking', icon: IconPackage },
        { number: 2, title: 'Location & Timing', icon: IconMapPin },
        { number: 3, title: 'Requirements', icon: IconSettings },
        { number: 4, title: 'Pricing & Final', icon: IconCurrencyDollar },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/jobs')}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <IconArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Job</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">Create a new job from an existing booking</p>
                        </div>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.number} className="flex items-center">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                                    currentStep >= step.number
                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                                }`}>
                                    {currentStep > step.number ? (
                                        <IconCheck className="w-5 h-5" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>
                                <span className={`ml-2 text-sm font-medium ${
                                    currentStep >= step.number
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    {step.title}
                                </span>
                                {index < steps.length - 1 && (
                                    <div className={`w-16 h-0.5 mx-4 ${
                                        currentStep > step.number
                                            ? 'bg-emerald-500'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleSubmit} className="p-8">
                        {/* Step Content */}
                        {renderStepContent()}

                        {/* Error Message */}
                        {errors.submit && (
                            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                <div className="flex items-center">
                                    <IconAlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                                    <span className="text-red-700 dark:text-red-400">{errors.submit}</span>
                                </div>
                            </div>
                        )}

                        {/* Success Message */}
                        {successMessage && (
                            <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                                <div className="flex items-center">
                                    <IconCheck className="w-5 h-5 text-emerald-500 mr-2" />
                                    <span className="text-emerald-700 dark:text-emerald-400">{successMessage}</span>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={prevStep}
                                disabled={currentStep === 1}
                                className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                                    currentStep === 1
                                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                Previous
                            </button>

                            <div className="flex gap-3">
                                {currentStep < 4 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <IconLoader className="w-4 h-4 animate-spin" />
                                                Creating Job...
                                            </>
                                        ) : (
                                            <>
                                                <IconDeviceFloppy className="w-4 h-4" />
                                                Create Job
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateJob; 