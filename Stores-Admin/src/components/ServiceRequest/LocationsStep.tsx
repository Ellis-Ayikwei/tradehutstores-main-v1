import React, { useEffect, useState } from 'react';
import { ErrorMessage, Field, useFormikContext } from 'formik';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBox,
    faBuilding,
    faCalendarAlt,
    faLocationDot,
    faTruck,
    faDollarSign,
    faPhone,
    faEnvelope,
    faWarehouse,
    faElevator,
    faCar,
    faImage,
    faClipboardList,
    faUser,
    faRulerCombined,
    faFileUpload,
    faGlobe,
    faMusic,
    faPalette,
    faCheckCircle,
    faShieldAlt,
    faThumbsUp,
    faCheck,
    faMoneyBill,
    faTag,
    faGavel,
    faArrowRight,
    faArrowLeft,
    faCamera,
    faCalendarCheck,
    faClock,
    faClipboardCheck,
    faFilePdf,
    faFile,
    faTimes,
    faCouch,
    faList,
    faPlus,
    faChevronUp,
    faChevronDown,
    faTv,
    faBlender,
    faInfoCircle,
    faWineGlassAlt,
    faDumbbell,
    faLeaf,
    faMapMarkedAlt,
    faGripLines,
    faRoute,
    faMapMarkerAlt,
    faTrash,
    faArrowUp,
    faArrowDown,
} from '@fortawesome/free-solid-svg-icons';
import { useServiceRequest } from '../../hooks/useServiceRequest';
import { JourneyStop } from '../../store/slices/serviceRequestSice';
import { JourneyPlanning } from './JourneyPlanning';
import StepNavigation from './stepNavigation';
import { useDispatch } from 'react-redux';
import { IRootState } from '../../store';
import { useSelector } from 'react-redux';
import { setStepData, updateFormValues } from '../../store/slices/createRequestSlice';
import { AppDispatch } from '../../store';
import { submitStepToAPI } from '../../store/slices/createRequestSlice';
import showMessage from '../../helper/showMessage';
import AddressAutocomplete from '../AddressAutocomplete';
import { v4 as uuidv4 } from 'uuid';

const propertyTypes = ['house', 'apartment', 'office', 'storage'];
const vehicleTypes = ['motorcycle', 'car', 'suv', 'truck', 'van'];
const storageDurations = ['<1 month', '1-3 months', '3-6 months', '6+ months'];

interface LocationsStepProps {
    values: any;
    handleChange: (e: React.ChangeEvent<any>) => void;
    handleBlur: (e: React.FocusEvent<any>) => void;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
    setTouched: (touched: { [field: string]: boolean }) => void;
    validateForm: () => Promise<any>;
    onNext: () => void;
    onBack: () => void;
    errors: any;
    touched: any;
    isEditing?: boolean;
    stepNumber: number;
}

const LocationsStep: React.FC<LocationsStepProps> = ({ values, handleChange, handleBlur, setFieldValue, setTouched, validateForm, onNext, onBack, errors, touched, isEditing = false, stepNumber }) => {
    const { addStop, updateStop, removeStop, currentRequest } = useServiceRequest();
    const dispatch = useDispatch<AppDispatch>();
    const { formValues, isEditing: formikIsEditing } = useSelector((state: IRootState) => state.serviceRequest);
    const isInstant = formValues.request_type === 'instant';
    const [isSubmitting, setIsSubmitting] = useState(false);

    console.log('formValues', formValues);
    console.log('values', values);

    // Update form values in Redux when they change
    useEffect(() => {
        dispatch(updateFormValues(values));
    }, [values, dispatch]);

    // Initialize journey_stops as an empty array if it doesn't exist
    useEffect(() => {
        if (!values.journey_stops) {
            setFieldValue('journey_stops', []);
        }
    }, [setFieldValue]);

    // Sync journey_stops with Redux
    useEffect(() => {
        if (values.journey_stops && currentRequest?.journey_stops) {
            const currentStops = values.journey_stops;
            const reduxStops = currentRequest.journey_stops;

            // Only update if there's a difference
            if (JSON.stringify(currentStops) !== JSON.stringify(reduxStops)) {
                setFieldValue('journey_stops', reduxStops);
            }
        }
    }, [currentRequest?.journey_stops, setFieldValue]);

    const handleRequestTypeChange = (newType: 'instant' | 'journey') => {
        if (newType === 'instant' && values.request_type !== 'instant') {
            setFieldValue('request_type', 'instant');

            // If we have more than 2 stops, keep only one pickup and one dropoff
            if (values.journey_stops && values.journey_stops.length > 2) {
                const pickup = values.journey_stops.find((s: JourneyStop) => s.type === 'pickup');
                const dropoff = values.journey_stops.find((s: JourneyStop) => s.type === 'dropoff');

                if (pickup && dropoff) {
                    setFieldValue('journey_stops', [pickup, dropoff]);
                }
            }
        } else if (newType === 'journey' && values.request_type !== 'journey') {
            setFieldValue('request_type', 'journey');

            // Initialize journey_stops if it doesn't exist
            if (!values.journey_stops) {
                setFieldValue('journey_stops', []);
            }
        }
    };

    const handleStopUpdate = async (index: number, updatedStop: JourneyStop) => {
        try {
            // Update in Redux
            await updateStop(index, updatedStop);

            // Update in formik
            const updatedStops = [...values.journey_stops];
            updatedStops[index] = updatedStop;
            setFieldValue('journey_stops', updatedStops);
        } catch (error) {
            console.error('Error updating stop:', error);
        }
    };

    const handleStopAdd = async (newStop: JourneyStop) => {
        try {
            // Add to Redux
            await addStop(newStop);

            // Add to formik
            setFieldValue('journey_stops', [...(values.journey_stops || []), newStop]);
        } catch (error) {
            console.error('Error adding stop:', error);
        }
    };

    const handleStopRemove = async (index: number) => {
        try {
            // Remove from Redux
            await removeStop(index);

            // Remove from formik
            const updatedStops = values.journey_stops.filter((_: JourneyStop, i: number) => i !== index);
            setFieldValue('journey_stops', updatedStops);
        } catch (error) {
            console.error('Error removing stop:', error);
        }
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);

            // First run the standard form validation
            const validationErrors = await validateForm();
            if (Object.keys(validationErrors).length > 0) {
                setTouched(validationErrors);
                showMessage('Please fill in all required fields', 'error');
                return;
            }

            // Additional validation for journey stops
            if (values.request_type === 'journey' && values.journey_stops && values.journey_stops.length > 0) {
                const stopValidationErrors: string[] = [];

                values.journey_stops.forEach((stop: any, index: number) => {
                    // Check if address is selected
                    const hasAddress = stop.location?.address && stop.location.address.trim() !== '';

                    // Check if coordinates are available (either from location or coordinates array)
                    const hasCoordinates =
                        (stop.location?.latitude !== null && stop.location?.longitude !== null) ||
                        (stop.coordinates && Array.isArray(stop.coordinates) && stop.coordinates[0] !== null && stop.coordinates[1] !== null);

                    if (!hasAddress) {
                        stopValidationErrors.push(`Stop ${index + 1}: Please select a valid address from the dropdown suggestions`);
                    }

                    if (!hasCoordinates) {
                        stopValidationErrors.push(`Stop ${index + 1}: Address coordinates are missing. Please reselect the address from suggestions`);
                    }

                    // Check for minimum required stops
                    const pickupStops = values.journey_stops.filter((s: any) => s.type === 'pickup');
                    const dropoffStops = values.journey_stops.filter((s: any) => s.type === 'dropoff');

                    if (pickupStops.length === 0) {
                        stopValidationErrors.push('At least one pickup location is required');
                    }

                    if (dropoffStops.length === 0) {
                        stopValidationErrors.push('At least one dropoff location is required');
                    }
                });

                if (stopValidationErrors.length > 0) {
                    showMessage(stopValidationErrors.join('. '), 'error');
                    return;
                }
            }

            // Format journey stops data
            const formattedJourneyStops = values.journey_stops.map((stop: any) => ({
                type: stop.type,
                location: {
                    address: stop.location.address,
                    address_line1: stop.address_line1,
                    city: stop.city,
                    county: stop.county,
                    postcode: stop.location.postcode || stop.postcode || '',
                    latitude: stop.location.latitude || stop.coordinates?.[0] || null,
                    longitude: stop.location.longitude || stop.coordinates?.[1] || null,
                    contact_name: stop.location.contact_name || stop.contact_name || '',
                    contact_phone: stop.location.contact_phone || stop.contact_phone || '',
                    special_instructions: stop.location.special_instructions || '',
                },
                unit_number: stop.unit_number || '',
                floor: stop.floor || 0,
                parking_info: stop.parking_info || '',
                has_elevator: stop.has_elevator || false,
                instructions: stop.instructions || '',
                property_type: stop.property_type || 'house',
                number_of_rooms: stop.number_of_rooms || 1,
                number_of_floors: stop.number_of_floors || 1,
                service_type: stop.service_type || '',
            }));

            const stepData = {
                journey_stops: formattedJourneyStops,
            };

            await dispatch(submitStepToAPI({ step: stepNumber, payload: stepData }));
            showMessage('Locations updated successfully', 'success');

            onNext();
        } catch (error) {
            console.error('Error submitting locations:', error);
            showMessage('Error submitting locations. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto px-2 ">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg  p-2 sm:p-2">
                {isInstant && (
                    <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-100 dark:border-blue-800">
                        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                            Your Move
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-start">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center mr-4 mt-1">
                                    <FontAwesomeIcon icon={faArrowUp} className="text-blue-600 dark:text-blue-300" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Pickup Location</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{values.pickup_location}</p>

                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Floor {values.pickup_floor}
                                        {values.pickup_has_elevator ? ' (with elevator)' : ' (no elevator)'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start mt-5">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faArrowDown} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">Dropoff Location</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{values.dropoff_location}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Floor {values.dropoff_floor}
                                        {values.dropoff_has_elevator ? ' (with elevator)' : ' (no elevator)'}
                                    </p>
                                </div>
                            </div>
                            {values.estimated_distance && (
                                <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-800">
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                        <FontAwesomeIcon icon={faRoute} className="mr-2" />
                                        <span>Estimated Distance: {values.estimated_distance} km</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center mb-6">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                            <FontAwesomeIcon icon={faLocationDot} />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Location Information</h2>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            {values.request_type === 'journey' ? 'Plan Your Multi-Stop Journey' : 'Specify Pickup & Dropoff Locations'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {values.request_type === 'journey'
                                ? 'Add multiple pickup and dropoff points with complete flexibility for complex moves.'
                                : "Your journey starts with a pickup and dropoff location. Need more stops? Just add them and we'll automatically convert to a multi-stop journey."}
                        </p>
                    </div>

                    {/* Show request type indicator */}
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 flex items-center">
                        <FontAwesomeIcon icon={values.request_type === 'journey' ? faRoute : faArrowRight} className={values.request_type === 'journey' ? 'text-purple-500' : 'text-blue-500'} />
                        <span className="ml-2 font-medium text-gray-800 dark:text-gray-200">{values.request_type === 'journey' ? 'Multi-Stop Journey' : 'Direct Route'}</span>
                    </div>

                    {/* Journey Planning - show only if request_type is 'journey' */}
                    {values.request_type === 'journey' && (
                        <>
                            {/* Validation reminder for journey stops */}
                            {values.journey_stops && values.journey_stops.length > 0 && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <div className="flex items-start">
                                        <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Address Selection Required</p>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                Please ensure all stops have valid addresses selected from the dropdown suggestions. This ensures accurate route mapping and coordinate data.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <JourneyPlanning values={values} setFieldValue={setFieldValue} />
                        </>
                    )}

                    {/* <div className="p-6 space-y-6">
                        <AddressAutocomplete
                            name="pickup_location"
                            value={values.pickup_location}
                            onChange={(value, coords) => {
                                setFieldValue('pickup_location', value);
                                if (coords) {
                                    setFieldValue('pickup_coordinates', coords);
                                }
                            }}
                            label="Street Address"
                            error={errors.pickup_location}
                            touched={touched.pickup_location}
                            required
                        />

                        <AddressAutocomplete
                            name="dropoff_location"
                            value={values.dropoff_location}
                            onChange={(value, coords) => {
                                setFieldValue('dropoff_location', value);
                                if (coords) {
                                    setFieldValue('dropoff_coordinates', coords);
                                }
                            }}
                            label="Street Address"
                            error={errors.dropoff_location}
                            touched={touched.dropoff_location}
                            required
                        />
                    </div> */}

                    <AddressAutocomplete
                        name="pickup_location"
                        value={values.pickup_location}
                        onChange={(value, coords) => {
                            setFieldValue('pickup_location', value);
                        }}
                    />
                    <StepNavigation
                        onBack={onBack}
                        onNext={onNext}
                        handleSubmit={handleSubmit}
                        nextLabel={isEditing ? 'Update & Continue' : 'Continue'}
                        isLastStep={false}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </div>
        </div>
    );
};

export default LocationsStep;
