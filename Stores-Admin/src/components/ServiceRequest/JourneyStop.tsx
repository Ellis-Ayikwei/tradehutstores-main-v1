import React from 'react';
import { Field } from 'formik';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripLines, faMapMarkerAlt, faCar, faTrash, faElevator, faClock } from '@fortawesome/free-solid-svg-icons';

interface JourneyStopProps {
    stop: any;
    index: number;
    provided: any;
    arrayHelpers: any;
}

const JourneyStop: React.FC<JourneyStopProps> = ({ stop, index, provided, arrayHelpers }) => {
    return (
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            id={`location-${stop.id}`} // Add this ID for scroll targeting
            className={`
        border rounded-lg p-4 
        ${stop.type === 'pickup' ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' : ''}
        ${stop.type === 'dropoff' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : ''}
        ${stop.type === 'stop' ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20' : ''}
      `}
        >
            <div className="flex items-start">
                <div {...provided.dragHandleProps} className="mr-3 cursor-grab flex-shrink-0 mt-2" onMouseDown={(e) => e.stopPropagation()}>
                    <FontAwesomeIcon icon={faGripLines} className="text-gray-400" />
                </div>

                <div
                    className={`
          w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-2
          ${stop.type === 'pickup' ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : ''}
          ${stop.type === 'dropoff' ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300' : ''}
          ${stop.type === 'stop' ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-300' : ''}
        `}
                >
                    {index + 1}
                </div>

                <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <div className="flex justify-between items-center mb-3">
                                <Field as="select" name={`journeyStops.${index}.type`} className="border-none bg-transparent text-sm font-medium focus:ring-0 p-0">
                                    <option value="pickup">Pickup Location</option>
                                    <option value="stop">Intermediate Stop</option>
                                    <option value="dropoff">Dropoff Location</option>
                                </Field>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        arrayHelpers.remove(index);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>

                            {/* Address field */}
                            <div className="relative mb-3">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                <Field
                                    name={`journeyStops.${index}.location`}
                                    placeholder="Enter full address"
                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 pl-10 pr-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Additional details section */}
                    <div className="mt-3">
                        <details className="text-sm">
                            <summary className="text-blue-600 dark:text-blue-400 cursor-pointer">Additional details</summary>
                            <div className="mt-3 pl-2 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                                <div>
                                    <label className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        <Field type="checkbox" name={`journeyStops.${index}.has_elevator`} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-1.5" />
                                        <FontAwesomeIcon icon={faElevator} className="mr-1.5" />
                                        Elevator Access
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Special Instructions</label>
                                    <Field
                                        as="textarea"
                                        rows="2"
                                        name={`journeyStops.${index}.instructions`}
                                        placeholder="Any specific details for this location"
                                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        <FontAwesomeIcon icon={faClock} className="mr-1.5" />
                                        Estimated Time at Location
                                    </label>
                                    <Field
                                        type="time"
                                        name={`journeyStops.${index}.estimated_time`}
                                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JourneyStop;
