// RouteTracker.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import 'leaflet/dist/leaflet.css';
import './RouteTracker.css'; // ← your CSS module with .mapContainer, .loading, .error, etc.

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
    OSRM_URL: 'https://router.project-osrm.org/route/v1/driving',
    FETCH_TIMEOUT: 5000, // ms
    MAX_RETRIES: 2,
    BACKOFF_BASE: 300, // ms
    INITIAL_ZOOM: 13,
    ICON_URLS: {
        retina: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        default: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadow: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        start: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        stop: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    },
};

// fix default leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: CONFIG.ICON_URLS.retina,
    iconUrl: CONFIG.ICON_URLS.default,
    shadowUrl: CONFIG.ICON_URLS.shadow,
});

// ─── TYPES ────────────────────────────────────────────────────────────────────
type StopRole = 'start' | 'intermediate' | 'stop';

interface Stop {
    lat: number;
    lng: number;
    role: StopRole;
}

// JourneyStop interface for compatibility with JourneyPlanning component
interface JourneyStop {
    id: string;
    type: 'pickup' | 'dropoff' | 'stop';
    location: {
        address: string;
        latitude: number | null;
        longitude: number | null;
        [key: string]: any;
    };
    coordinates: [number, number] | null;
    [key: string]: any;
}

interface RouteSegment {
    coords: [number, number][];
    duration: number; // seconds
    distance: number; // meters
}

interface Props {
    stops: Stop[] | JourneyStop[];
}

// ─── HELPER: fetch with timeout & retries ────────────────────────────────────
async function fetchWithTimeout(url: string, opts: RequestInit, timeout: number) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const resp = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(id);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp;
    } finally {
        clearTimeout(id);
    }
}

async function fetchRouteSegment(from: Stop, to: Stop, attempt: number = 0): Promise<RouteSegment> {
    const coordsKey = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
    const url = `${CONFIG.OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full`;
    try {
        const resp = await fetchWithTimeout(url, {}, CONFIG.FETCH_TIMEOUT);
        const data = await resp.json();
        const r = data.routes?.[0];
        if (!r) throw new Error('No route');
        return {
            coords: polyline.decode(r.geometry).map(([lat, lng]) => [lat, lng]),
            duration: r.duration,
            distance: r.distance,
        };
    } catch (err) {
        if (attempt < CONFIG.MAX_RETRIES) {
            await new Promise((res) => setTimeout(res, CONFIG.BACKOFF_BASE * 2 ** attempt));
            return fetchRouteSegment(from, to, attempt + 1);
        }
        // fallback empty segment
        return { coords: [], duration: 0, distance: 0 };
    }
}

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────────────────

// Transform JourneyStop to RouteTracker Stop format
const transformJourneyStopsToStops = (journeyStops: JourneyStop[]): Stop[] => {
    console.log('Transform input journeyStops:', journeyStops);

    return journeyStops
        .map((stop, index) => {
            console.log(`Processing stop ${index}:`, stop);

            // Get coordinates from multiple possible sources
            let lat: number, lng: number;

            // Try coordinates array first
            if (stop.coordinates && Array.isArray(stop.coordinates) && stop.coordinates.length === 2 && stop.coordinates[0] !== null && stop.coordinates[1] !== null) {
                [lat, lng] = stop.coordinates;
                console.log(`Stop ${index}: Using coordinates array:`, [lat, lng]);
            }
            // Try location object next
            else if (
                stop.location &&
                typeof stop.location.latitude === 'number' &&
                typeof stop.location.longitude === 'number' &&
                stop.location.latitude !== null &&
                stop.location.longitude !== null
            ) {
                lat = stop.location.latitude;
                lng = stop.location.longitude;
                console.log(`Stop ${index}: Using location object:`, [lat, lng]);
            }
            // Try direct properties (fallback)
            else if (typeof (stop as any).latitude === 'number' && typeof (stop as any).longitude === 'number') {
                lat = (stop as any).latitude;
                lng = (stop as any).longitude;
                console.log(`Stop ${index}: Using direct properties:`, [lat, lng]);
            } else {
                console.warn(`Stop ${index} missing valid coordinates:`, {
                    coordinates: stop.coordinates,
                    location: stop.location,
                    directLat: (stop as any).latitude,
                    directLng: (stop as any).longitude,
                    fullStop: stop,
                });
                return null; // Skip stops without valid coordinates
            }

            // Validate coordinates are valid numbers
            if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                console.warn(`Stop ${index} has invalid coordinates:`, { lat, lng, stop });
                return null;
            }

            // Map journey stop types to RouteTracker roles
            let role: StopRole;
            if (stop.type === 'pickup') {
                role = index === 0 ? 'start' : 'intermediate';
            } else if (stop.type === 'dropoff') {
                role = 'stop';
            } else {
                role = 'intermediate';
            }

            const transformedStop = { lat, lng, role };
            console.log(`Stop ${index} transformed:`, transformedStop);
            return transformedStop;
        })
        .filter((stop): stop is Stop => {
            const isValid = stop !== null;
            if (!isValid) console.log('Filtered out invalid stop');
            return isValid;
        });
};

// Type guard to check if stops are JourneyStops
const isJourneyStops = (stops: Stop[] | JourneyStop[]): stops is JourneyStop[] => {
    if (!stops || stops.length === 0) {
        console.log('isJourneyStops: No stops provided');
        return false;
    }

    // Check if the first stop has the JourneyStop structure
    const firstStop = stops[0];
    console.log('isJourneyStops: Checking first stop:', firstStop);

    const hasJourneyStopStructure = 'location' in firstStop || 'type' in firstStop || 'coordinates' in firstStop || 'id' in firstStop;

    // Also check if it doesn't have the simple Stop structure
    const hasSimpleStopStructure = 'lat' in firstStop && 'lng' in firstStop && 'role' in firstStop && !('location' in firstStop) && !('type' in firstStop);

    const result = hasJourneyStopStructure && !hasSimpleStopStructure;
    console.log('isJourneyStops result:', {
        result,
        hasJourneyStopStructure,
        hasSimpleStopStructure,
        firstStopKeys: Object.keys(firstStop),
    });

    return result;
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
const RouteTracker: React.FC<Props> = ({ stops }) => {
    // --- State
    const [routes, setRoutes] = useState<RouteSegment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const cacheRef = useRef<Map<string, RouteSegment>>(new Map());

    // Transform JourneyStops to Stops if needed
    const processedStops: Stop[] = useMemo(() => {
        if (!stops || stops.length === 0) return [];

        if (isJourneyStops(stops)) {
            console.log('Transforming journey stops:', stops);
            const transformed = transformJourneyStopsToStops(stops);
            console.log('Transformed stops:', transformed);
            return transformed;
        } else {
            console.log('Using stops as-is:', stops);
            return stops as Stop[];
        }
    }, [stops]);

    // --- Validate stops prop at runtime
    useEffect(() => {
        if (!Array.isArray(processedStops) || processedStops.length < 2) {
            setError('Need at least two valid stops with coordinates');
        } else {
            setError(null);
        }
    }, [processedStops]);

    // --- Fetch all segments in parallel, with cancellation
    useEffect(() => {
        if (error || processedStops.length < 2) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const segments = processedStops.map((_, i) => i < processedStops.length - 1 && [processedStops[i], processedStops[i + 1]]).filter(Boolean) as [Stop, Stop][];

        setLoading(true);
        Promise.all(
            segments.map(async ([from, to]) => {
                const key = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
                if (cacheRef.current.has(key)) {
                    return cacheRef.current.get(key)!;
                }
                const seg = await fetchRouteSegment(from, to);
                cacheRef.current.set(key, seg);
                return seg;
            })
        )
            .then((segs) => setRoutes(segs))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [processedStops, error]);

    // --- Compute travel details and totals
    const details = useMemo(() => {
        let total = 0;
        return processedStops.map((s, i) => {
            const seg = i === 0 ? { duration: 0 } : routes[i - 1] || { duration: 0 };
            total += seg.duration;
            return {
                ...s,
                segmentDuration: seg.duration,
                cumulative: total,
            };
        });
    }, [processedStops, routes]);

    // Calculate totals from routes
    const totals = useMemo(() => {
        const totalDistance = routes.reduce((sum, route) => sum + route.distance, 0);
        const totalDuration = routes.reduce((sum, route) => sum + route.duration, 0);

        return {
            distance: totalDistance,
            duration: totalDuration,
            distanceKm: (totalDistance / 1000).toFixed(1),
            durationMin: (totalDuration / 60).toFixed(0),
            durationHours: totalDuration > 3600 ? Math.floor(totalDuration / 3600) : 0,
            durationRemainingMin: totalDuration > 3600 ? Math.floor((totalDuration % 3600) / 60) : Math.floor(totalDuration / 60),
        };
    }, [routes]);

    // --- Pick map center (start)
    const start = processedStops.find((s) => s.role === 'start') || processedStops[0];

    // Safety check to ensure we have valid stops
    if (!processedStops || processedStops.length === 0) {
        return (
            <div className="rt-container">
                <div className="rt-error">No valid coordinates found for route display</div>
            </div>
        );
    }

    // --- Render
    return (
        <div className="rt-container">
            {loading && <div className="rt-loading">Fetching routes…</div>}
            {error && <div className="rt-error">Error: {error}</div>}

            <MapContainer center={start ? [start.lat, start.lng] : [51.505, -0.09]} zoom={CONFIG.INITIAL_ZOOM} className="rt-mapContainer">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {processedStops.map((s, i) => (
                    <Marker
                        key={i}
                        position={[s.lat, s.lng]}
                        icon={
                            s.role === 'start'
                                ? new L.Icon({ iconUrl: CONFIG.ICON_URLS.start, iconSize: [25, 41] })
                                : s.role === 'stop'
                                ? new L.Icon({ iconUrl: CONFIG.ICON_URLS.stop, iconSize: [25, 41] })
                                : L.Icon.Default.prototype
                        }
                    >
                        <Popup>
                            <strong>{s.role.toUpperCase()}</strong>
                            <br />
                            {s.lat?.toFixed(5) || 'N/A'}, {s.lng?.toFixed(5) || 'N/A'}
                        </Popup>
                    </Marker>
                ))}

                {routes.map((r, i) => r.coords.length > 0 && <Polyline key={i} positions={r.coords} className="rt-polyline" />)}

                {/* Distance and Time Overlay */}
                {routes.length > 0 && totals.distance > 0 && (
                    <div className="rt-stats-overlay">
                        <div className="rt-stats-content">
                            <div className="rt-stats-item">
                                <span className="rt-stats-icon">📍</span>
                                <span className="rt-stats-value">{totals.distanceKm} km</span>
                            </div>
                            <div className="rt-stats-item">
                                <span className="rt-stats-icon">⏱️</span>
                                <span className="rt-stats-value">{totals.durationHours > 0 ? `${totals.durationHours}h ${totals.durationRemainingMin}m` : `${totals.durationRemainingMin}m`}</span>
                            </div>
                        </div>
                    </div>
                )}
            </MapContainer>

            <table className="rt-table">
                <thead>
                    <tr>
                        <th>Role</th>
                        <th>Coords</th>
                        <th>Segment (min)</th>
                        <th>Cumulative (min)</th>
                    </tr>
                </thead>
                <tbody>
                    {details.map((d, i) => (
                        <tr key={i}>
                            <td>{d.role || 'Unknown'}</td>
                            <td>
                                {d.lat?.toFixed(5) || 'N/A'}, {d.lng?.toFixed(5) || 'N/A'}
                            </td>
                            <td>{(d.segmentDuration / 60).toFixed(1)}</td>
                            <td>{(d.cumulative / 60).toFixed(1)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RouteTracker;
