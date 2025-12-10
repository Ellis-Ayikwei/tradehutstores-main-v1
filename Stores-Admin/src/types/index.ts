export interface ServiceRequest {
    // ... existing fields ...
    selected_price?: number;
    staff_count?: number;
    selected_date?: string;
    request_id?: string;
    // ... existing fields ...
}

export interface GuestUserData {
    name: string;
    email: string;
    phone: string;
    user_id?: string;
}
