export interface AuthUser {
    user: {
        id: string;
        email: string;
        user_type: string;
        name?: string;
    };
}

export interface UserProfile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    user_type: string;
    address?: {
        street: string;
        city: string;
        state: string;
        country: string;
        postal_code: string;
    };
    company?: {
        name: string;
        vat_number?: string;
        website?: string;
        business_hours?: string;
    };
    preferences: {
        language: string;
        timezone: string;
        currency: string;
        theme: 'light' | 'dark' | 'auto';
        notifications: {
            email: boolean;
            sms: boolean;
            push: boolean;
            marketing: boolean;
        };
    };
    security: {
        two_factor_enabled: boolean;
        last_login: string;
        active_sessions: number;
    };
    created_at: string;
    updated_at: string;
}

export interface PasswordData {
    current: string;
    new: string;
    confirm: string;
}
