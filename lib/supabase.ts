import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'farmer' | 'insurer' | 'admin';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed';
export type ClaimStatus = 'None' | 'Pending' | 'Approved' | 'Rejected' | 'Paid';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  aadhaar_number?: string;
  address?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  role: UserRole;
  created_at: string;
}

export interface FarmProfile {
  id: string;
  user_id: string;
  farm_name: string;
  location: string;
  area: number;
  crop_type: string;
  soil_type?: string;
  season: string;
  created_at: string;
}

export interface PolicyProduct {
  id: string;
  name: string;
  insurer_id?: string;
  description?: string;
  crop_type: string;
  season: string;
  base_premium: number;
  coverage_amount: number;
  duration_months: number;
  automation_config?: {
    enabled?: boolean;
    min_rainfall_7day_avg?: number;
    max_temperature?: number;
    trigger_percentage?: number;
    [key: string]: any;
  };
  created_at: string;
}

export interface UserPolicy {
  id: string;
  user_id: string;
  farm_id: string;
  policy_product_id: string;
  insurer_id?: string;
  premium_amount: number;
  coverage_amount: number;
  purchase_date: string;
  start_date: string;
  end_date: string;
  payment_status: PaymentStatus;
  claim_status: ClaimStatus;
  created_at: string;
}

export interface WeatherObservation {
  id: string;
  farm_id: string;
  timestamp: string;
  rainfall_mm: number;
  temperature_c: number;
  humidity: number;
}

export interface Claim {
  id: string;
  user_policy_id: string;
  triggered_at: string;
  reason: string;
  amount_claimed: number;
  status: ClaimStatus;
  reviewed_by?: string;
  payout_reference_id?: string;
  created_at: string;
}
