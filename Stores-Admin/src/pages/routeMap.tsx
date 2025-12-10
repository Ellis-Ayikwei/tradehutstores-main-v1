import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RouteTracker = () => {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [inputCoords, setInputCoords] = useState({ lat: '', lng: '' });

  const icons = {
    start: new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      iconSize: [25, 41],
    }),
    stop: new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      iconSize: [25, 41],
    }),
  };

  const addStop = () => {
    const newStop = {
      lat: parseFloat(inputCoords.lat),
      lng: parseFloat(inputCoords.lng),
      timestamp: new Date().toISOString(),
    };
    setStops([...stops, newStop]);
    setInputCoords({ lat: '', lng: '' });
  };

  // Fetch routes with actual duration data
  useEffect(() => {
    const fetchRoutes = async () => {
      const newRoutes = [];
      for (let i = 0; i < stops.length - 1; i++) {
        const start = stops[i];
        const end = stops[i + 1];
        
        try {
          const response = await fetch(
            `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full`
          );
          const data = await response.json();
          
          if (data.routes?.[0]) {
            newRoutes.push({
              coords: polyline.decode(data.routes[0].geometry).map(([lat, lng]) => [lat, lng]),
              duration: data.routes[0].duration, // Actual duration in seconds from OSRM
              distance: data.routes[0].distance,
            });
          }
        } catch (error) {
          console.error('Error fetching route:', error);
          newRoutes.push(null);
        }
      }
      setRoutes(newRoutes);
    };

    if (stops.length > 1) fetchRoutes();
  }, [stops]);

  // Calculate cumulative travel time
  const getTravelTimes = () => {
    return stops.map((stop, index) => ({
      ...stop,
      duration: index === 0 ? 0 : 
        routes[index - 1]?.duration || 'N/A',
      totalDuration: routes
        .slice(0, index)
        .reduce((sum, route) => sum + (route?.duration || 0), 0)
    }));
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="number"
          placeholder="Latitude"
          value={inputCoords.lat}
          onChange={(e) => setInputCoords({ ...inputCoords, lat: e.target.value })}
          step="0.000001"
        />
        <input
          type="number"
          placeholder="Longitude"
          value={inputCoords.lng}
          onChange={(e) => setInputCoords({ ...inputCoords, lng: e.target.value })}
          step="0.000001"
        />
        <button onClick={addStop} disabled={!inputCoords.lat || !inputCoords.lng}>
          Add Stop
        </button>
      </div>

      {stops.length > 0 && (
        <MapContainer
          center={[stops[0].lat, stops[0].lng]}
          zoom={13}
          style={{ height: '500px', marginBottom: '20px' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {stops.map((stop, index) => (
            <Marker
              key={index}
              position={[stop.lat, stop.lng]}
              icon={index === 0 ? icons.start : index === stops.length - 1 ? icons.stop : L.Icon.Default.prototype}
            >
              <Popup>
                {index === 0 ? 'START' : index === stops.length - 1 ? 'END' : `Stop ${index}`}
                <br />
                {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
              </Popup>
            </Marker>
          ))}

          {routes.map((route, index) => (
            route?.coords && (
              <Polyline
                key={index}
                positions={route.coords}
                color="#4CAF50"
                weight={3}
                opacity={0.8}
              />
            )
          ))}
        </MapContainer>
      )}

      {stops.length > 0 && (
        <div>
          <h3>Travel Times</h3>
          <table>
            <thead>
              <tr>
                <th>Stop</th>
                <th>Coordinates</th>
                <th>Segment Duration</th>
                <th>Total Duration</th>
              </tr>
            </thead>
            <tbody>
              {getTravelTimes().map((stop, index) => (
                <tr key={index}>
                  <td>{index === 0 ? 'Start' : `Stop ${index}`}</td>
                  <td>{stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}</td>
                  <td>
                    {index > 0 && (
                      typeof stop.duration === 'number' 
                        ? `${Math.round(stop.duration / 60)} mins` 
                        : 'N/A'
                    )}
                  </td>
                  <td>
                    {typeof stop.totalDuration === 'number'
                      ? `${Math.round(stop.totalDuration / 60)} mins`
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RouteTracker;