export interface Insurance {
    id?: string;
    name: string;
    description: string;
    sum_assured: number;
    monthly_premium_ghs: number;
    annual_premium_ghs: number;
    is_active: boolean;
    benefits: Benefit[];
}

interface Benefit {
    name: string;
    id: string;
    premium_payable: number;
}

export interface InputChangeEvent extends React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> {}

export type Permission = {
    id: string;
    name: string;
    resource_type: string;
    action: string;
    description: string;
    users: Array<{}>;
};

export type PermissionsResponse = {
    resource_type: string;
    permissions: Permission[];
}[];

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'system' | 'booking' | 'payment' | 'alert' | 'reminder';
    read: boolean;
    created_at: string;
    action_url?: string;
    booking_id?: string;
    metadata?: Record<string, any>;
}

export interface JourneyItem {
    id?: string;
    name: string;
    category?: string;
    quantity: number;
    weight?: string;
    dimensions?: string;
    value?: string;
    fragile?: boolean;
    needsDisassembly?: boolean;
    notes?: string;
    photo?: File | string | null;
}

export interface JourneyStop {
    id: string;
    type: 'pickup' | 'dropoff' | 'waypoint';
    location: string;
    unit_number?: string;
    floor?: number;
    parking_info?: string;
    has_elevator?: boolean;
    instructions?: string;
    estimated_time?: string;
    property_type?: 'house' | 'apartment' | 'office' | 'storage' | 'retail' | 'industrial';
    number_of_rooms?: number;
    number_of_floors?: number;
    needs_disassembly?: boolean;
    is_fragile?: boolean;
    service_type?: string;
    selected_rooms?: string[];
    other_rooms?: string;
    items?: JourneyItem[];
    linked_items?: string[]; // Array of item IDs for dropoff points
    coordinates?: { lat: number; lng: number };
}

export interface ServiceRequest {
    id?: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    pickup_location?: string;
    dropoff_location?: string;
    service_type?: string;
    item_size?: string;
    preferred_date?: string;
    preferred_time?: string;
    estimated_value?: string;
    description?: string;
    pickup_floor?: number;
    pickup_unit_number?: string;
    pickup_parking_info?: string;
    dropoff_floor?: number;
    dropoff_unit_number?: string;
    dropoff_parking_info?: string;
    number_of_rooms?: number;
    number_of_floors?: number;
    property_type?: 'house' | 'apartment' | 'office' | 'storage';
    has_elevator?: boolean;
    dropoff_property_type?: 'house' | 'apartment' | 'office' | 'storage';
    dropoff_number_of_rooms?: number;
    storage_duration?: string;
    vehicle_type?: 'motorcycle' | 'car' | 'suv' | 'truck' | 'van';
    international_destination?: string;
    special_handling?: string;
    is_flexible?: boolean;
    needs_insurance?: boolean;
    request_type: 'instant' | 'bidding' | 'journey';
    photo_urls?: string[];
    inventory_list?: File;
    item_weight?: string;
    item_dimensions?: string;
    needs_disassembly?: boolean;
    is_fragile?: boolean;
    pickup_number_of_floors?: number;
    dropoff_number_of_floors?: number;
    pickup_has_elevator?: boolean;
    dropoff_has_elevator?: boolean;
    moving_items?: JourneyItem[];
    journey_stops?: JourneyStop[];
    status?: string;
    created_at?: string;
    updated_at?: string;
    pickup_coordinates?: { lat: number; lng: number };
    dropoff_coordinates?: { lat: number; lng: number };
}

// Updated type definition to use snake_case directly from the backend
export interface ApiItem {
    id: string;
    name: string;
    category: {
        id: string;
        name: string;
        requires_special_handling: boolean;
        restricted: boolean;
        insurance_required: boolean;
    };
    declared_value: number | null;
    description: string;
    dimensions: string | null;
    fragile: boolean;
    needs_disassembly: boolean;
    photos: string[] | null;
    quantity: number;
    special_instructions: string;
    weight: string | null;
}

export interface ApiStop {
    id: string;
    location: string;
    type: 'pickup' | 'dropoff' | 'stop';
    instructions: string | null;
}

export interface ApiBooking {
    id: string;
    tracking_number: string;
    request_type: string;
    status: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    created_at: string;
    updated_at: string;
    pickup_location: string | null;
    dropoff_location: string | null;
    preferred_pickup_date: string | null;
    preferred_pickup_time: string | null;
    preferred_pickup_time_window: string | null;
    preferred_delivery_date: string | null;
    preferred_delivery_time: string | null;
    service_type: string;
    service_level: string;
    priority: string;
    payment_status: string;
    insurance_required: boolean;
    insurance_value: number | null;
    is_flexible: boolean;
    requires_special_handling: boolean;
    special_instructions: string;
    items_description: string;
    items: ApiItem[];
    stops: ApiStop[];
    base_price: number | null;
    final_price: number | null;
    cancellation_fee: number | null;
    cancellation_reason: string;
    cancellation_time: string | null;
    estimated_distance: string | null;
    estimated_completion_time: string | null;
    loading_time: string | null;
    unloading_time: string | null;
    total_weight: string | null;
    dimensions: string | null;
    photo_urls: string[];
    price_breakdown: Record<string, any> | null;
    price_factors: Record<string, any> | null;
    route_waypoints: Record<string, any> | null;
    user: string;
}
