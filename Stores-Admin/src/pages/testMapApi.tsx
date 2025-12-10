// In your React component
import { LoadScript, Autocomplete } from '@react-google-maps/api';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

import React, { useState } from 'react';
import RouteMap from './routeMap';

const TestMapApi = () => {
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Configure what data to show in suggestions
  const formatSuggestions = (place: any) => {
    const components = {
      locality: '',
      postalCode: '',
      administrativeArea: '',
      country: '',
    };

    place.address_components.forEach((component: { types: string[], long_name: string, short_name: string }) => {
      if (component.types.includes('locality')) components.locality = component.long_name;
      if (component.types.includes('postal_code')) components.postalCode = component.short_name;
      if (component.types.includes('administrative_area_level_1')) components.administrativeArea = component.short_name;
      if (component.types.includes('country')) components.country = component.long_name;
    });

    // Format like "Notting Hill, London, UK" or "Westminster, London SW1, UK"
    return [
      components.locality,
      components.administrativeArea,
      components.postalCode ? `${components.postalCode.split(' ')[0]}` : '',
      components.country
    ].filter(Boolean).join(', ');
  };

  const handlePlaceSelect = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const place = await autocomplete.getPlace();
      
      if (!place.place_id) {
        throw new Error('No place selected');
      }

      const formattedLabel = formatSuggestions(place);
      
      setSelectedPlace({
        label: formattedLabel,
        value: place.place_id,
        coords: {
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng()
        },
        fullData: place
      });

      console.log(selectedPlace);

    } catch (err) {
      setError('Error fetching place details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const initialStart = { lat: 51.46761, lng: -0.1583477 };
  const initialEnd = { lat: 51.5055, lng: -0.0754 };

  return (
    <div>
        <LoadScript
          googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={['places']}
          loadingElement={<div>Loading...</div>}
        >
          <div style={{ width: '100%', maxWidth: '500px', margin: '20px auto' }}>
            <Autocomplete
              onLoad={(autocomplete) => setAutocomplete(autocomplete)}
              onPlaceChanged={handlePlaceSelect}
              fields={['address_components', 'geometry', 'name', 'place_id']}
              options={{
                types: ['geocode'],
                componentRestrictions: { country: 'GB' },
                fields: ['address_components', 'geometry', 'name', 'place_id'],
              }}
            >
              <input
                type="text"
                placeholder="Search locations (e.g. 'Notting Hill, London')"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${error ? '#ff0000' : '#cccccc'}`,
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </Autocomplete>
            {isLoading && <div style={{ marginTop: '10px' }}>Loading details...</div>}
            {error && <div style={{ color: '#ff0000', marginTop: '10px' }}>{error}</div>}
            {selectedPlace && (
              <div style={{ marginTop: '20px' }}>
                <h4>Selected Location:</h4>
                <p>{selectedPlace.label}</p>
                <p>Coordinates: {selectedPlace.coords.lat.toFixed(6)}, {selectedPlace.coords.lng.toFixed(6)}</p>
              </div>
            )}
          </div>
        </LoadScript>
        <div>
      <h1>Route Planner</h1>
      <RouteMap initialStart={initialStart} initialEnd={initialEnd} />
    </div>
    </div>
  );
};

export default TestMapApi;