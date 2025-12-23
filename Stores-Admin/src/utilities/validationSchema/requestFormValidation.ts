import * as Yup from 'yup';

// Step 2: Location Details Validation
const locationDetailsValidation = Yup.object().shape({
    pickup_location: Yup.string().when('request_type', {
        is: 'instant',
        then: Yup.string().required('Pickup location is required').min(5, 'Address must be at least 5 characters'),
        otherwise: Yup.string(),
    }),
    pickup_floor: Yup.number().when('request_type', {
        is: 'instant',
        then: Yup.number().min(0, 'Floor cannot be negative').max(100, 'Floor must be less than 100'),
        otherwise: Yup.number(),
    }),
    pickup_unit_number: Yup.string(),
    pickup_parking_info: Yup.string(),
    pickup_number_of_floors: Yup.number().when('request_type', {
        is: 'instant',
        then: Yup.number().min(1, 'Must be at least 1 floor').max(100, 'Must be less than 100 floors'),
        otherwise: Yup.number(),
    }),
    pickup_has_elevator: Yup.boolean(),
    dropoff_location: Yup.string().when('request_type', {
        is: 'instant',
        then: Yup.string().required('Dropoff location is required').min(5, 'Address must be at least 5 characters'),
        otherwise: Yup.string(),
    }),
    dropoff_floor: Yup.number().when('request_type', {
        is: 'instant',
        then: Yup.number().min(0, 'Floor cannot be negative').max(100, 'Floor must be less than 100'),
        otherwise: Yup.number(),
    }),
    dropoff_unit_number: Yup.string(),
    dropoff_parking_info: Yup.string(),
    dropoff_number_of_floors: Yup.number().when('request_type', {
        is: 'instant',
        then: Yup.number().min(1, 'Must be at least 1 floor').max(100, 'Must be less than 100 floors'),
        otherwise: Yup.number(),
    }),
    dropoff_has_elevator: Yup.boolean(),
    property_type: Yup.string().when('request_type', {
        is: 'instant',
        then: Yup.string().oneOf(['house', 'apartment', 'office', 'storage'], 'Invalid property type'),
        otherwise: Yup.string(),
    }),
    dropoff_property_type: Yup.string().when('request_type', {
        is: 'instant',
        then: Yup.string().oneOf(['house', 'apartment', 'office', 'storage'], 'Invalid property type'),
        otherwise: Yup.string(),
    }),
});

// Step 1: Contact Details Validation
const contactDetailsValidation = Yup.object().shape({
    // contact_name: Yup.string().required('Full name is required').min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
    // contact_phone: Yup.string()
    //     .required('Phone number is required')
    //     .matches(/^[0-9+\-\s()]*$/, 'Invalid phone number format'),
    // contact_email: Yup.string().email('Invalid email address').required('Email is required'),
    // request_type: Yup.string().required('Request type is required').oneOf(['instant', 'journey'], 'Invalid request type'),
    service_type: Yup.string()
        .required('Service type is required')
        .when('request_type', {
            is: 'instant',
            then: Yup.string().oneOf(
                [
                    'Residential Moving',
                    'Office Relocation',
                    'Piano Moving',
                    'Antique Moving',
                    'Storage Services',
                    'Packing Services',
                    'Vehicle Transportation',
                    'International Moving',
                    'Furniture Assembly',
                    'Fragile Items',
                    'Artwork Moving',
                    'Industrial Equipment',
                    'Electronics',
                    'Appliances',
                    'Boxes/Parcels',
                ],
                'Invalid service type'
            ),
        }),
    ...locationDetailsValidation.fields,
});

// Step 3: Service Details Validation
const serviceDetailsValidation = Yup.object().shape({
    moving_items: Yup.array().of(
        Yup.object().shape({
            name: Yup.string().required('Item name is required'),
            category: Yup.string().required('Item category is required'),
            quantity: Yup.number().required('Quantity is required').min(1, 'Quantity must be at least 1'),
            weight: Yup.number().min(0, 'Weight cannot be negative').max(1000, 'Weight must be less than 1000kg'),
            dimensions: Yup.string(),
            fragile: Yup.boolean(),
            needs_disassembly: Yup.boolean(),
        })
    ),
    inventory_list: Yup.string(),
    photo_urls: Yup.array().of(Yup.string()),
    special_handling: Yup.string(),
    is_flexible: Yup.boolean(),
    needs_insurance: Yup.boolean(),
    needs_disassembly: Yup.boolean(),
    is_fragile: Yup.boolean(),
});

// Step 4: Schedule Validation
const scheduleValidation = Yup.object().shape({
    preferred_date: Yup.date().required('Preferred date is required').min(new Date(), 'Date cannot be in the past'),
    preferred_time: Yup.string()
        .required('Preferred time is required')
        .oneOf(['8:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'], 'Invalid time slot'),
    is_flexible: Yup.boolean(),
    needs_insurance: Yup.boolean(),
    estimated_value: Yup.string().when('needs_insurance', {
        is: true,
        then: Yup.string().required('Estimated value is required for insurance'),
    }),
});

// Journey Stops Validation (for journey type requests)
const journeyStopsValidation = Yup.object().shape({
    journey_stops: Yup.array().when('request_type', {
        is: 'journey',
        then: Yup.array()
            .of(
                Yup.object().shape({
                    type: Yup.string().oneOf(['pickup', 'dropoff', 'stop'], 'Invalid stop type'),
                    location: Yup.string().required('Location is required'),
                    unit_number: Yup.string(),
                    floor: Yup.number().min(0, 'Floor cannot be negative').max(100, 'Floor must be less than 100'),
                    parking_info: Yup.string(),
                    has_elevator: Yup.boolean(),
                    instructions: Yup.string(),
                    estimated_time: Yup.string(),
                })
            )
            .min(2, 'Journey must have at least 2 stops'),
    }),
});

// Combined validation schema
export const validationSchema = Yup.object().shape({
    ...contactDetailsValidation.fields,
    ...locationDetailsValidation.fields,
    ...serviceDetailsValidation.fields,
    ...scheduleValidation.fields,
    ...journeyStopsValidation.fields,
});

// Step-specific validation schemas
export const stepValidationSchemas = {
    step1: contactDetailsValidation,
    step2: locationDetailsValidation,
    step3: serviceDetailsValidation,
    step4: scheduleValidation,
};
