import { faLocationDot, faMapMarkerAlt, faRoute } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { Job } from '../../types/job';
import { geocodeAddress } from '../../utils/geocodingService';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different location types
const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41],
});

const stopIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41],
});

interface JobMapProps {
    job: Job;
    height?: string;
}

// Component to handle route fetching and map bounds
const RouteLayer: React.FC<{
    locations: { lat: number; lng: number; address: string; type: string }[];
    onRouteLoaded: (coordinates: [number, number][]) => void;
}> = ({ locations, onRouteLoaded }) => {
    const map = useMap();

    useEffect(() => {
        const fetchRoute = async () => {
            if (locations.length < 2) return;

            try {
                // Build waypoints for OSRM
                const waypoints = locations.map((loc) => `${loc.lng},${loc.lat}`).join(';');

                // Fetch route from OSRM
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`);
                const data = await response.json();

                if (data.routes && data.routes[0]) {
                    // Extract coordinates from the route and convert to [lat, lng] for Leaflet
                    const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => {
                        // OSRM returns [lng, lat], convert to [lat, lng] for Leaflet
                        return [coord[1], coord[0]] as [number, number];
                    });

                    onRouteLoaded(coordinates);

                    // Create bounds that include all locations and the route
                    const allPoints = [...locations.map((loc) => [loc.lat, loc.lng] as [number, number]), ...coordinates];
                    const bounds = L.latLngBounds(allPoints);

                    // Fit map to bounds with padding
                    map.fitBounds(bounds, {
                        padding: [20, 20],
                        maxZoom: 15,
                    });
                }
            } catch (error) {
                console.error('Error fetching route:', error);
                // Fallback to direct lines if route fetching fails
                const directRoute = locations.map((loc) => [loc.lat, loc.lng] as [number, number]);
                onRouteLoaded(directRoute);

                // Still fit bounds to show all locations
                const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng] as [number, number]));
                map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
            }
        };

        fetchRoute();
    }, [locations, map, onRouteLoaded]);

    return null;
};

const JobMap: React.FC<JobMapProps> = ({ job, height = '400px' }) => {
    const [mapLocations, setMapLocations] = useState<{ lat: number; lng: number; address: string; type: string }[]>([]);
    const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]); // Default to London
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const geocodeLocations = async () => {
            try {
                setLoading(true);
                setError(null);

                const locations = job.request.all_locations || [];
                if (locations.length === 0) {
                    setError('No locations available for this job');
                    setLoading(false);
                    return;
                }

                const geocodedLocations = [];

                for (const location of locations) {
                    try {
                        const response = await geocodeAddress(location.address);
                        if (response.results && response.results[0]) {
                            const coords = response.results[0].geometry.location;
                            geocodedLocations.push({
                                lat: coords.lat,
                                lng: coords.lng,
                                address: location.address,
                                type: location.type,
                            });
                        }
                    } catch (geocodeError) {
                        console.error('Error geocoding location:', location.address, geocodeError);
                    }
                }

                if (geocodedLocations.length > 0) {
                    setMapLocations(geocodedLocations);

                    // Set center to midpoint of all locations
                    const avgLat = geocodedLocations.reduce((sum, loc) => sum + loc.lat, 0) / geocodedLocations.length;
                    const avgLng = geocodedLocations.reduce((sum, loc) => sum + loc.lng, 0) / geocodedLocations.length;
                    setMapCenter([avgLat, avgLng]);
                } else {
                    setError('Could not geocode any locations');
                }
            } catch (err) {
                console.error('Error in geocoding process:', err);
                setError('Failed to load map locations');
            } finally {
                setLoading(false);
            }
        };

        geocodeLocations();
    }, [job]);

    if (loading) {
        return (
            <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 shadow-2xl border border-white/20 dark:border-slate-700/30 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-700/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FontAwesomeIcon icon={faRoute} className="text-blue-500" />
                        Route Map
                    </h3>
                </div>
                <div style={{ height }} className="flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">Loading map...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 shadow-2xl border border-white/20 dark:border-slate-700/30 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-700/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FontAwesomeIcon icon={faRoute} className="text-red-500" />
                        Route Map
                    </h3>
                </div>
                <div style={{ height }} className="flex items-center justify-center">
                    <div className="text-center p-8">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-4xl text-slate-400 dark:text-slate-500 mb-4" />
                        <p className="text-slate-600 dark:text-slate-400 font-medium">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (mapLocations.length === 0) {
        return (
            <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70  shadow-2xl border border-white/20 dark:border-slate-700/30 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-700/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FontAwesomeIcon icon={faRoute} className="text-slate-500" />
                        Route Map
                    </h3>
                </div>
                <div style={{ height }} className="flex items-center justify-center">
                    <div className="text-center p-8">
                        <FontAwesomeIcon icon={faLocationDot} className="text-4xl text-slate-400 dark:text-slate-500 mb-4" />
                        <p className="text-slate-600 dark:text-slate-400 font-medium">No route information available</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70  shadow-2xl border border-white/20 dark:border-slate-700/30 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FontAwesomeIcon icon={faRoute} className="text-blue-500" />
                    Route Map
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                    {mapLocations.length} location{mapLocations.length > 1 ? 's' : ''} • {job.request.estimated_distance || 0}km
                </p>
            </div>

            <div style={{ height }} className="relative">
                <MapContainer center={mapCenter} zoom={13} className="h-full w-full" scrollWheelZoom={false} style={{ borderRadius: '0 0 1.5rem 1.5rem' }}>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {mapLocations.length > 0 && <RouteLayer locations={mapLocations} onRouteLoaded={setRouteCoordinates} />}

                    {mapLocations.map((location, index) => {
                        const icon = location.type === 'pickup' ? pickupIcon : location.type === 'dropoff' ? deliveryIcon : stopIcon;

                        return (
                            <Marker key={index} position={[location.lat, location.lng]} icon={icon}>
                                <Popup>
                                    <div className="text-sm">
                                        <p className={`font-medium ${location.type === 'pickup' ? 'text-blue-600' : location.type === 'dropoff' ? 'text-green-600' : 'text-orange-600'}`}>
                                            {location.type === 'pickup' ? 'Pickup Location' : location.type === 'dropoff' ? 'Delivery Location' : `Stop ${index}`}
                                        </p>
                                        <p className="text-slate-700 mt-1">{location.address}</p>
                                        <p className="text-slate-500 text-xs mt-2">
                                            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {routeCoordinates.length > 0 && <Polyline positions={routeCoordinates} color="#3B82F6" weight={4} opacity={0.8} lineCap="round" lineJoin="round" />}
                </MapContainer>
            </div>
        </div>
    );
};

export default JobMap;
