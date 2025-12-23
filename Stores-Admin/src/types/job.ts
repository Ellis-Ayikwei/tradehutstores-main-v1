export interface MovingItem {
    id: string;
    name: string;
    quantity: number;
    dimensions: string;
    weight: string;
    fragile?: boolean;
    category_id: string;
    declared_value?: number;
    needs_disassembly?: boolean;
    notes?: string;
    photo?: string;
    special_instructions?: string;
}

export interface Location {
    id: string;
    type: 'pickup' | 'dropoff' | 'stop';
    address: string;
    unit_number?: string;
    parking_info?: string;
    instructions?: string;
    scheduled_time?: string;
    preferred_pickup_time?: string;
    preferred_delivery_time?: string;
    completed_time?: string;
}

export interface Stop extends Location {
    external_id?: string;
    location?: string;
    contact_name?: string;
}

export interface PriceBreakdown {
    base_price: number;
    additional_charges?: number;
    discount?: number;
    total_price: number;
}

export interface RequestDocument {
    id: string;
    request: string;
    document_type?: string;
    document_name?: string;
    file: string;
    file_name?: string;
    file_size?: number;
    file_url?: string;
    uploaded_by?: string;
    uploaded_by_name?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface Job {
    id: string;
    created_at: string;
    status: string;
    // Provider assignment fields
    assigned_provider?: any[];
    is_instant?: boolean;
    // Provider interest fields
    available_to_providers?: boolean;
    made_available_at?: string | null;
    interested_providers_count?: number;
    interested_providers: string[];
    assigned_staffs: string[];
    assigned_vehicles: string[];
    request: {
        id: string;
        user: {
            id: string;
            first_name: string;
            last_name: string;
            email: string;
            phone_number: string;
        };
        driver: string | null;
        request_type: 'instant' | 'auction' | 'journey';
        status: string;
        priority: string;
        service_type: string;
        contact_name: string;
        contact_phone: string;
        contact_email: string;
        contact_company?: string;
        contact_avatar?: string;
        contact_rating?: number;
        tracking_number: string;
        base_price: number;
        payment_status: string;
        insurance_required: boolean;
        insurance_value?: number;
        estimated_distance: number;
        travel_time?: string;
        notes?: string;
        special_instructions?: string;
        required_qualifications?: string[];
        special_requirements?: string[];
        preferred_vehicle_types?: string[];
        photo_urls?: string[];
        moving_items: MovingItem[];
        all_locations: Location[];
        journey_stops?: Stop[];
        preferred_pickup_date?: string;
        preferred_pickup_time?: string;
        preferred_delivery_date?: string;
        preferred_delivery_time?: string;
        volume?: string;
        volume_breakdown?: {
            total_length?: number;
            total_width?: number;
            total_height?: number;
            total_weight?: number;
        };
        items?: [];
        // Driver and vehicle assignment fields
        assigned_staffs?: any[];
        assigned_vehicles?: any[];
        documents?: RequestDocument[];
    };
    bidding_end_time?: string;
    bids?: Bid[];
    timeline?: TimelineEvent[];
    completionSteps?: CompletionStep[];
    chat_messages?: ChatMessage[];
}

export interface Bid {
    id: string;
    provider: string;
    amount: number;
    message?: string;
    notes?: string;
    createdAt: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface TimelineEvent {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    visibility: 'all' | 'provider' | 'customer' | 'system';
    metadata?: Record<string, string>;
    created_by?: string;
}

export interface CompletionStep {
    id: string;
    title: string;
    description: string;
    status: 'completed' | 'pending';
    required: boolean;
}

export interface ChatMessage {
    id: string;
    sender: string;
    senderType: 'customer' | 'provider' | 'system';
    message: string;
    createdAt: string;
    attachments?: Array<{
        name: string;
        url: string;
        type: string;
    }>;
}
