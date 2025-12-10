import { 
    ArrowLeft, 
    Calendar, 
    Car, 
    Cog, 
    Edit,
    Fuel, 
    IdCard, 
    MapPin, 
    Palette, 
    Ruler, 
    Shield, 
    Truck, 
    Trash2,
    User, 
    Weight, 
    Wrench,
    Eye,
    Download,
    FileText,
    Image as ImageIcon,
    Power,
    PowerOff,
    X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import vehicleService, { Vehicle } from '../../../../../../services/vehicleService';
import showMessage from '../../../../../../helper/showMessage';
import useSWR from 'swr';
import fetcher from '../../../../../../services/fetcher';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface VehicleImage {
    id: string;
    image: string;
    description?: string;
    order: number;
    created_at: string;
}

interface VehicleDocument {
    id: string;
    document_type: string;
    document: string;
    description?: string;
    expiry_date?: string;
    created_at: string;
}

const ViewVehiclePage: React.FC = () => {
    const navigate = useNavigate();
    const { vehicleId } = useParams();
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);

    const { data: vehicleData, error: vehicleError } = useSWR(
        vehicleId ? `/vehicles/${vehicleId}/` : null,
        fetcher
    );

    console.log("vehicle", vehicleData)

    const { data: vehicleImages } = useSWR(
        vehicleId ? `/vehicles/${vehicleId}/photos/` : null,
        fetcher
    );

    const { data: vehicleDocuments } = useSWR(
        vehicleId ? `/vehicles/${vehicleId}/documents/` : null,
        fetcher
    );

    useEffect(() => {
        if (vehicleData) {
            setVehicle(vehicleData);
            setLoading(false);
        }
    }, [vehicleData]);

    const handleBack = () => {
        navigate(-1);
    };

    const handleImageClick = (index: number) => {
        setSelectedImageIndex(index);
        setShowImageModal(true);
    };

    const handleDownloadDocument = (doc: VehicleDocument) => {
        const link = document.createElement('a');
        link.href = doc.document;
        link.download = `${doc.document_type}_${vehicle?.registration}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEditVehicle = () => {
        navigate(`/vehicle-management/edit/${vehicleId}?providerId=${vehicle?.provider?.id}`);
    };

    const handleDeleteVehicle = async () => {
        if (!vehicle) return;
        
        if (!window.confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) {
            return;
        }
        
        try {
            await vehicleService.deleteVehicle(vehicle.id);
            showMessage('success', 'Vehicle deleted successfully');
            navigate(-1);
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            showMessage('error', 'Failed to delete vehicle');
        }
    };

    const handleToggleStatus = async () => {
        if (!vehicle) return;
        
        try {
            await vehicleService.updateVehicle(vehicle.id, {
                is_active: !vehicle.is_active
            });
            showMessage('success', `Vehicle ${vehicle.is_active ? 'deactivated' : 'activated'} successfully`);
            // Refresh vehicle data
            window.location.reload();
        } catch (error) {
            console.error('Error updating vehicle status:', error);
            showMessage('error', 'Failed to update vehicle status');
        }
    };

    const getDocumentIcon = (documentType: string) => {
        switch (documentType) {
            case 'log_book':
                return <FileText className="w-5 h-5" />;
            case 'mot':
                return <Shield className="w-5 h-5" />;
            case 'v5':
                return <IdCard className="w-5 h-5" />;
            case 'insurance':
                return <Shield className="w-5 h-5" />;
            default:
                return <FileText className="w-5 h-5" />;
        }
    };

    const getDocumentTypeLabel = (documentType: string) => {
        switch (documentType) {
            case 'log_book':
                return 'Log Book';
            case 'mot':
                return 'MOT Certificate';
            case 'v5':
                return 'V5 Document';
            case 'insurance':
                return 'Insurance Certificate';
            case 'service_book':
                return 'Service Book';
            default:
                return 'Other Document';
        }
    };

    // Map component for vehicle location
    const VehicleLocationMap: React.FC<{ location: any }> = ({ location }) => {
        if (!location || !location.coordinates) {
            return (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No location data available</p>
                </div>
            );
        }

        const { lat, lng } = location.coordinates;
        const position: [number, number] = [lat, lng];

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                        Vehicle Location
                    </h3>
                </div>
                <div className="h-64">
                    <MapContainer 
                        center={position} 
                        zoom={15} 
                        className="h-full w-full"
                        scrollWheelZoom={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={position}>
                            <Popup>
                                <div className="text-sm">
                                    <p className="font-medium text-blue-600">Vehicle Location</p>
                                    <p>{location.address}</p>
                                    {location.components && (
                                        <div className="mt-2 text-xs text-gray-600">
                                            {location.components.address_line1 && <p>{location.components.address_line1}</p>}
                                            {location.components.city && <p>{location.components.city}</p>}
                                            {location.components.postcode && <p>{location.components.postcode}</p>}
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    </MapContainer>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading vehicle details...</p>
                </div>
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Vehicle not found</p>
                </div>
            </div>
        );
    }

    const images = vehicleImages || [];
    const documents = vehicleDocuments || [];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleBack}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                                                    <div className="flex items-center space-x-3">
                            <Eye className="text-blue-500" />
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                Vehicle Details
                            </h1>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={handleToggleStatus}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                                    vehicle?.is_active
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700'
                                }`}
                                title={vehicle?.is_active ? 'Deactivate Vehicle' : 'Activate Vehicle'}
                            >
                                {vehicle?.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                                <span className="text-xs">{vehicle?.is_active ? 'Deactivate' : 'Activate'}</span>
                            </button>
                            <button
                                onClick={handleEditVehicle}
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                                title="Edit Vehicle"
                            >
                                <Edit className="w-3 h-3" />
                                <span className="text-xs">Edit</span>
                            </button>
                            <button
                                onClick={handleDeleteVehicle}
                                className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                                title="Delete Vehicle"
                            >
                                <Trash2 className="w-3 h-3" />
                                <span className="text-xs">Delete</span>
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Image Gallery */}
                {images.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                <ImageIcon className="w-5 h-5 mr-2 text-blue-500" />
                                Vehicle Photos ({images.length})
                            </h2>
                        </div>
                        
                        {/* Main Image */}
                        <div className="relative h-96 bg-gray-100 dark:bg-gray-700">
                            {images.length > 0 ? (
                                <img
                                    src={images[selectedImageIndex]?.image+"/"}
                                    alt={`Vehicle ${selectedImageIndex + 1}`}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => setShowImageModal(true)}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <ImageIcon className="w-16 h-16 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Gallery */}
                        {images.length > 1 && (
                            <div className="p-6">
                                <div className="flex space-x-4 overflow-x-auto pb-2">
                                    {images.map((image: VehicleImage, index: number) => (
                                        <div
                                            key={image.id}
                                            className={`flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                                index === selectedImageIndex
                                                    ? 'border-blue-500'
                                                    : 'border-gray-200 dark:border-gray-600'
                                            }`}
                                            onClick={() => setSelectedImageIndex(index)}
                                        >
                                            <img
                                                src={image.image}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="w-20 h-20 object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Vehicle Information */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Basic Information */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Details */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Car className="w-5 h-5 mr-2 text-blue-500" />
                                    Basic Information
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Registration
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {vehicle.registration}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Make & Model
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {vehicle.make} {vehicle.model}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Year
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">{vehicle.year}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Vehicle Type
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">
                                                {vehicle.vehicle_type?.name || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Category
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">
                                                {vehicle.vehicle_category?.name || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Color
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">{vehicle.color || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Fuel Type
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">{vehicle.fuel_type}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Transmission
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">{vehicle.transmission}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Seats
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">{vehicle.seats}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Primary Driver
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">
                                                {vehicle.primary_driver?.name || 'Not assigned'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Location
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">
                                                {vehicle.primary_location?.address || 'No location set'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Capacity & Dimensions */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Ruler className="w-5 h-5 mr-2 text-green-500" />
                                    Capacity & Dimensions
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Payload Capacity
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">
                                                {vehicle.payload_capacity_kg} kg
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Gross Vehicle Weight
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">
                                                {vehicle.gross_vehicle_weight_kg} kg
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Max Length
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">
                                                {vehicle.max_length_m ? `${vehicle.max_length_m}m` : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Load Volume
                                        </label>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <p className="text-gray-900 dark:text-white">
                                                {vehicle.load_volume_m3} m³
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Cog className="w-5 h-5 mr-2 text-purple-500" />
                                    Features & Equipment
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${vehicle.has_tail_lift ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-gray-900 dark:text-white">Tail Lift</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${vehicle.has_tracking_device ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-gray-900 dark:text-white">Tracking Device</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${vehicle.has_dash_cam ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-gray-900 dark:text-white">Dash Cam</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Shield className="w-5 h-5 mr-2 text-orange-500" />
                                    Status & Compliance
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-600 dark:text-gray-400">Active Status</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        vehicle.is_active 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
                                    }`}>
                                        {vehicle.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-600 dark:text-gray-400">Availability</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        vehicle.is_available 
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                                    }`}>
                                        {vehicle.is_available ? 'Available' : 'Unavailable'}
                                    </span>
                                </div>
                                {vehicle.insurance_expiry_date && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Insurance Expiry</span>
                                        <p className="text-gray-900 dark:text-white font-medium">
                                            {new Date(vehicle.insurance_expiry_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Vehicle Location Map */}
                        <VehicleLocationMap location={vehicle.primary_location} />

                        {/* Documents */}
                        {documents.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                        <FileText className="w-5 h-5 mr-2 text-blue-500" />
                                        Documents ({documents.length})
                                    </h2>
                                </div>
                                <div className="p-6 space-y-3">
                                    {documents.map((doc: VehicleDocument) => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                {getDocumentIcon(doc.document_type)}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {getDocumentTypeLabel(doc.document_type)}
                                                    </p>
                                                    {doc.expiry_date && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDownloadDocument(doc)}
                                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                title="Download document"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Modal */}
            {showImageModal && images.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="relative max-w-4xl max-h-full p-4">
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={images[selectedImageIndex]?.image}
                            alt={`Vehicle ${selectedImageIndex + 1}`}
                            className="max-w-full max-h-full object-contain"
                        />
                        {images.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                {images.map((image: VehicleImage, index: number) => (
                                    <button
                                        key={image.id}
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`w-3 h-3 rounded-full ${
                                            index === selectedImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewVehiclePage; 