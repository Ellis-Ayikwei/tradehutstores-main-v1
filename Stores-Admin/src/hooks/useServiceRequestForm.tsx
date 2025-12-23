// In src/hooks/useServiceRequestForm.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, IRootState } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { setCurrentStep, updateFormValues, getPricePreview, resetForm, submitStepToAPI } from '../store/slices/createRequestSlice';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import showMessage from '../helper/showMessage';
import { ServiceRequest } from '../types';
import { fetchServiceRequestById } from '../store/slices/serviceRequestSice';

// Define form type options
const formTypeOptions = [
    { value: 'instant', label: 'Instant Booking' },
    { value: 'journey', label: 'Multi-Stop Journey' },
];

// Define payload types for each step
interface Step1Payload {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    request_type: 'instant' | 'bidding' | 'journey';
}

interface Step2Payload {
    pickup_location: string;
    pickup_unit_number?: string;
    pickup_floor?: number;
    pickup_parking_info?: string;
    pickup_has_elevator?: boolean;
    dropoff_location: string;
    dropoff_unit_number?: string;
    dropoff_floor?: number;
    dropoff_parking_info?: string;
    dropoff_has_elevator?: boolean;
    journey_stops?: Array<{
        id: string;
        type: 'pickup' | 'dropoff' | 'stop';
        location: string;
        unit_number?: string;
        floor?: number;
        parking_info?: string;
        has_elevator?: boolean;
        instructions?: string;
        estimated_time?: string;
    }>;
}

interface Step3Payload {
    service_type: string;
    item_size: string;
    description: string;
    photo_urls?: string[];
    moving_items?: Array<{
        id: string;
        name: string;
        description: string;
        quantity: number;
        fragile: boolean;
        needs_disassembly: boolean;
    }>;
}

interface Step4Payload {
    preferred_date: string;
    preferred_time: string;
    is_flexible: boolean;
    needs_insurance: boolean;
    estimated_value?: string;
}

type StepPayload = Step1Payload | Step2Payload | Step3Payload | Step4Payload;

// Helper function to format payload based on step
const formatStepPayload = (step: number, values: any): StepPayload => {
    switch (step) {
        case 1:
            return {
                contact_name: values.contact_name,
                contact_phone: values.contact_phone,
                contact_email: values.contact_email,
                request_type: values.request_type,
            };
        case 2:
            return {
                pickup_location: values.pickup_location,
                pickup_unit_number: values.pickup_unit_number,
                pickup_floor: values.pickup_floor,
                pickup_parking_info: values.pickup_parking_info,
                pickup_has_elevator: values.pickup_has_elevator,
                dropoff_location: values.dropoff_location,
                dropoff_unit_number: values.dropoff_unit_number,
                dropoff_floor: values.dropoff_floor,
                dropoff_parking_info: values.dropoff_parking_info,
                dropoff_has_elevator: values.dropoff_has_elevator,
                journey_stops: values.journey_stops,
            };
        case 3:
            return {
                service_type: values.service_type,
                item_size: values.item_size,
                description: values.description,
                photo_urls: values.photo_urls,
                moving_items: values.moving_items,
            };
        case 4:
            return {
                preferred_date: values.preferred_date,
                preferred_time: values.preferred_time,
                is_flexible: values.is_flexible,
                needs_insurance: values.needs_insurance,
                estimated_value: values.estimated_value,
            };
        default:
            throw new Error(`Invalid step number: ${step}`);
    }
};

export const useServiceRequestForm = (isEditing = false, bookingId?: string) => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useAuthUser<{ id: string }>();
    const { currentStep, formValues, isLoading, isEditing: isEditingMode, requestId, pricePreview } = useSelector((state: IRootState) => state.serviceRequest);

    // Step navigation using Redux
    const moveToNextStep = async (values: any) => {
        try {
            const formattedPayload = formatStepPayload(currentStep, values);
            const result = await dispatch(
                submitStepToAPI({
                    step: currentStep,
                    payload: formattedPayload,
                    isEditing: isEditingMode,
                    requestId: requestId || undefined,
                })
            ).unwrap();

            if (currentStep === 4) {
                await dispatch(getPricePreview(requestId || '')).unwrap();
            }

            dispatch(setCurrentStep(Math.min(currentStep + 1, 4)));
            window.scrollTo(0, 0);
        } catch (error) {
            console.error('Error moving to next step:', error);
        }
    };

    const moveToPreviousStep = () => {
        dispatch(setCurrentStep(Math.max(currentStep - 1, 1)));
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (values: ServiceRequest) => {
        try {
            const formattedPayload = formatStepPayload(4, values);
            const result = await dispatch(
                submitStepToAPI({
                    step: 4,
                    payload: formattedPayload,
                    isEditing: isEditingMode,
                    requestId: requestId || undefined,
                })
            ).unwrap();

            if (result.step === 4) {
                showMessage(isEditingMode ? 'Request updated successfully.' : 'Request created successfully.', 'success');
                dispatch(resetForm());
                navigate(isEditingMode ? `/account/bookings/${requestId}` : '/my-bookings');
            }
        } catch (error) {
            console.error('Submission error:', error);
            showMessage('Failed to save request.', 'error');
        }
    };

    useEffect(() => {
        if (isEditing && bookingId) {
            dispatch(fetchServiceRequestById({ requestId: bookingId, userId: user?.id || '' }));
        }
    }, [isEditing, bookingId, user?.id, dispatch]);

    const handlerequestTypeChange = (type: 'instant' | 'bidding' | 'journey', currentValues: any, setFieldValue: any) => {
        if (type === 'journey' && (!currentValues.journey_stops || currentValues.journey_stops.length === 0)) {
            const initialStops = [
                {
                    id: uuidv4(),
                    type: 'pickup',
                    location: currentValues.pickup_location || '',
                    unit_number: currentValues.pickup_unit_number || '',
                    floor: currentValues.pickup_floor || 0,
                    parking_info: currentValues.pickup_parking_info || '',
                    has_elevator: currentValues.pickup_has_elevator || false,
                    instructions: '',
                    estimated_time: '',
                },
                {
                    id: uuidv4(),
                    type: 'dropoff',
                    location: currentValues.dropoff_location || '',
                    unit_number: currentValues.dropoff_unit_number || '',
                    floor: currentValues.dropoff_floor || 0,
                    parking_info: currentValues.dropoff_parking_info || '',
                    has_elevator: currentValues.dropoff_has_elevator || false,
                    instructions: '',
                    estimated_time: '',
                },
            ];
            setFieldValue('journey_stops', initialStops);
        }
    };

    return {
        currentStep,
        formValues,
        isLoading,
        isEditing: isEditingMode,
        requestId,
        pricePreview,
        moveToNextStep,
        moveToPreviousStep,
        handleSubmit,
        handlerequestTypeChange,
        formTypeOptions,
    };
};
