import { v4 as uuidv4 } from 'uuid';

export const useJourneyPlanning = () => {
interface JourneyStop {
    id: string;
    type: 'pickup' | 'dropoff' | 'stop';
    location: string;
    unitNumber: string;
    floor: number;
    parkingInfo: string;
    hasElevator: boolean;
    instructions: string;
    estimatedTime: string;
}

interface JourneyValues {
    journeyStops: JourneyStop[];
}

type SetFieldValue = (field: string, value: any) => void;

const addJourneyStop = (
    values: JourneyValues,
    setFieldValue: SetFieldValue,
    type: 'pickup' | 'dropoff' | 'stop' = 'stop'
): void => {
    const newStop: JourneyStop = {
        id: uuidv4(),
        type: type,
        location: '',
        unitNumber: '',
        floor: 0,
        parkingInfo: '',
        hasElevator: false,
        instructions: '',
        estimatedTime: ''
    };
    
    const stops = [...values.journeyStops];
    
    // If this is the first stop and it's not a pickup, add a pickup first
    if (stops.length === 0 && type !== 'pickup') {
        stops.push({
            ...newStop,
            id: uuidv4(),
            type: 'pickup'
        });
    }
    
    // If adding a pickup, add it at the beginning
    if (type === 'pickup') {
        stops.unshift(newStop);
    } 
    // If adding a dropoff, add it at the end
    else if (type === 'dropoff') {
        stops.push(newStop);
    } 
    // If adding a stop, insert it before the first dropoff if any, otherwise at the end
    else {
        const dropoffIndex = stops.findIndex(stop => stop.type === 'dropoff');
        if (dropoffIndex !== -1) {
            stops.splice(dropoffIndex, 0, newStop);
        } else {
            stops.push(newStop);
        }
    }
    
    setFieldValue('journeyStops', stops);
};
  
  return {
    addJourneyStop
  };
};