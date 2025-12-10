interface Stop {
    address: string;
    type?: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}

interface RouteLeg {
    distance: {
        text: string;
        value: number; // in meters
    };
    duration: {
        text: string;
        value: number; // in seconds
    };
    start_address: string;
    end_address: string;
}

interface RouteDetails {
    totalDistance: number;
    totalDuration: number;
    legs: RouteLeg[];
}

const formatDistance = (meters: number): string => {
    if (meters < 1000) {
        return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
};

const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
};

export const calculateRouteDetails = async (stops: Stop[]): Promise<RouteDetails> => {
    try {
        const coordinates = stops.map(stop => [stop.coordinates.lng, stop.coordinates.lat]);
        
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': process.env.REACT_APP_OPENROUTE_API_KEY || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates,
                format: 'json'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to calculate route');
        }

        const data = await response.json();
        const route = data.routes[0];
        
        const legs: RouteLeg[] = [];
        let totalDistance = 0;
        let totalDuration = 0;

        // Process each segment of the route
        route.segments.forEach((segment: any, index: number) => {
            const leg: RouteLeg = {
                distance: {
                    text: formatDistance(segment.distance),
                    value: segment.distance
                },
                duration: {
                    text: formatDuration(segment.duration),
                    value: segment.duration
                },
                start_address: stops[index].address,
                end_address: stops[index + 1]?.address || stops[0].address
            };
            legs.push(leg);
            totalDistance += segment.distance;
            totalDuration += segment.duration;
        });

        return {
            totalDistance,
            totalDuration,
            legs
        };
    } catch (error) {
        console.error('Error calculating route:', error);
        throw error;
    }
}; 