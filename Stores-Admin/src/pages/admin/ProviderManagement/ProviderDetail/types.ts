export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  profile_picture: string | null;
  rating: string;
  user_type: string;
  account_status: string;
  last_active: string | null;
  date_joined: string;
  created_at: string;
}

export interface Address {
  id: string;
  address_type: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postcode: string;
  state: string;
  country: string;
  business_name: string;
  is_primary: boolean;
  is_verified: boolean;
  is_active: boolean;
  verification_date: string | null;
  verification_method: string;
  notes: string;
}

export interface Provider {
  id: string;
  user: User;
  business_type: string;
  company_name: string;
  company_reg_number: string;
  vat_registered: boolean;
  vat_number: string;
  business_description: string;
  website: string;
  founded_year: number | null;
  operating_areas: string[];
  contact_person_name: string;
  contact_person_position: string;
  contact_person_email: string;
  contact_person_phone: string;
  bank_account_holder: string;
  bank_name: string;
  bank_account_number: string;
  bank_routing_number: string;
  service_categories: string[];
  services_offered: string[];
  specializations: string[];
  service_image: string | null;
  base_location: string | null;
  hourly_rate: number | null;
  accepts_instant_bookings: boolean;
  service_radius_km: number;
  insurance_policies: any[];
  payment_methods: string[];
  minimum_job_value: number | null;
  verification_status: string;
  last_verified: string;
  operating_areas: string[];
  documents: any[];
  reviews: any[];
  payments: any[];
  addresses: Address[];
  status: string;
  verificationStatus: string;
  rating: number;
  average_rating: number;
  completed_bookings_count: number;
  vehicle_count: number;
  last_active: string | null;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  type: string;
  color: string;
  registrationExpiry: string;
}

export interface Document {
  id: string;
  type: 'insurance' | 'license' | 'other';
  name: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  expiryDate?: string;
}

export interface Payment {
  id: string;
  type: 'payment' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  reference: string;
}

export interface Booking {
  id: string;
  date: string;
  customer: string;
  customerName: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
} 