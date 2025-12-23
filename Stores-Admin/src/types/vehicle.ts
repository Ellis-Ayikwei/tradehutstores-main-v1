export interface Vehicle {
    id?: string;
    registration: string;
    make: string;
    model: string;
    year: number;
    seats: number;
    vehicle_type: string | null; // FK id
    fuel_type: string;
    transmission: string;
    color: string;
    payload_capacity_kg: number;
    gross_vehicle_weight_kg: number;
    max_length_m: number | null;
    load_volume_m3: number;
    insurance_policy_number: string;
    insurance_expiry_date: string | null;
    fleet_number: string;
    has_tail_lift: boolean;
    has_tracking_device: boolean;
    has_dash_cam: boolean;
    additional_features: any;
    provider: string; // FK id
    primary_driver: string | null; // FK id
    is_active: boolean;
    is_available: boolean;
    location: any;
    last_location_update: string | null;
    primary_location: string | null; // FK id
    copy_of_log_book?: string | null;
    copy_of_MOT?: string | null;
    V5_Document?: string | null;
    images?: string[];
} 