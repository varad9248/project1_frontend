-- =====================================================
-- Agri-Shield Insurance Portal - Database Schema
-- =====================================================
-- This SQL file creates the complete database schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Create custom types
CREATE TYPE user_role AS ENUM ('farmer', 'insurer', 'admin');
CREATE TYPE payment_status AS ENUM ('Pending', 'Paid', 'Failed');
CREATE TYPE claim_status AS ENUM ('None', 'Pending', 'Approved', 'Rejected', 'Paid');

-- =====================================================
-- TABLE: user_profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  aadhaar_number text,
  address text,
  bank_account_number text,
  ifsc_code text,
  role user_role NOT NULL DEFAULT 'farmer',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: farm_profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS farm_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  farm_name text NOT NULL,
  location text NOT NULL,
  area numeric NOT NULL,
  crop_type text NOT NULL,
  soil_type text,
  season text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: policy_products
-- =====================================================
CREATE TABLE IF NOT EXISTS policy_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  insurer_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  description text,
  crop_type text NOT NULL,
  season text NOT NULL,
  base_premium numeric NOT NULL,
  coverage_amount numeric NOT NULL,
  duration_months integer NOT NULL DEFAULT 6,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: user_policies
-- =====================================================
CREATE TABLE IF NOT EXISTS user_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  farm_id uuid REFERENCES farm_profiles(id) ON DELETE CASCADE NOT NULL,
  policy_product_id uuid REFERENCES policy_products(id) ON DELETE CASCADE NOT NULL,
  insurer_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  premium_amount numeric NOT NULL,
  coverage_amount numeric NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  payment_status payment_status DEFAULT 'Pending',
  claim_status claim_status DEFAULT 'None',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: weather_observations
-- =====================================================
CREATE TABLE IF NOT EXISTS weather_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farm_profiles(id) ON DELETE CASCADE NOT NULL,
  timestamp timestamptz DEFAULT now(),
  rainfall_mm numeric NOT NULL DEFAULT 0,
  temperature_c numeric NOT NULL DEFAULT 0,
  humidity numeric NOT NULL DEFAULT 0
);

-- =====================================================
-- TABLE: claims
-- =====================================================
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_policy_id uuid REFERENCES user_policies(id) ON DELETE CASCADE NOT NULL,
  triggered_at timestamptz DEFAULT now(),
  reason text NOT NULL,
  amount_claimed numeric NOT NULL,
  status claim_status DEFAULT 'Pending',
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  payout_reference_id text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_policies_user_id ON user_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_policies_farm_id ON user_policies(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_profiles_user_id ON farm_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_user_policy_id ON claims(user_policy_id);
CREATE INDEX IF NOT EXISTS idx_weather_observations_farm_id ON weather_observations(farm_id);
CREATE INDEX IF NOT EXISTS idx_weather_observations_timestamp ON weather_observations(timestamp);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: user_profiles
-- =====================================================
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'insurer')
  ));

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert users"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  ));

-- =====================================================
-- RLS POLICIES: farm_profiles
-- =====================================================
CREATE POLICY "Farmers can view own farms"
  ON farm_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'insurer')
  ));

CREATE POLICY "Farmers can insert own farms"
  ON farm_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Farmers can update own farms"
  ON farm_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES: policy_products
-- =====================================================
CREATE POLICY "Anyone can view policy products"
  ON policy_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insurers can manage policy products"
  ON policy_products FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'insurer')
  ));

CREATE POLICY "Insurers can update policy products"
  ON policy_products FOR UPDATE
  TO authenticated
  USING (insurer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  ))
  WITH CHECK (insurer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  ));

CREATE POLICY "Insurers can delete policy products"
  ON policy_products FOR DELETE
  TO authenticated
  USING (insurer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  ));

-- =====================================================
-- RLS POLICIES: user_policies
-- =====================================================
CREATE POLICY "Users can view own policies"
  ON user_policies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = insurer_id OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'insurer')
  ));

CREATE POLICY "Farmers can purchase policies"
  ON user_policies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Insurers can update policy status"
  ON user_policies FOR UPDATE
  TO authenticated
  USING (auth.uid() = insurer_id OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'insurer')
  ))
  WITH CHECK (auth.uid() = insurer_id OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'insurer')
  ));

-- =====================================================
-- RLS POLICIES: weather_observations
-- =====================================================
CREATE POLICY "Users can view related weather data"
  ON weather_observations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM farm_profiles
    WHERE farm_profiles.id = weather_observations.farm_id
    AND (farm_profiles.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'insurer')
    ))
  ));

CREATE POLICY "System can insert weather data"
  ON weather_observations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- RLS POLICIES: claims
-- =====================================================
CREATE POLICY "Users can view related claims"
  ON claims FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_policies
    WHERE user_policies.id = claims.user_policy_id
    AND (user_policies.user_id = auth.uid() OR user_policies.insurer_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'insurer')
    ))
  ));

CREATE POLICY "System can create claims"
  ON claims FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Insurers can update claims"
  ON claims FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'insurer')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'insurer')
  ));

-- =====================================================
-- FUNCTION: check_and_trigger_claims
-- Automated claim triggering based on weather data
-- =====================================================
CREATE OR REPLACE FUNCTION check_and_trigger_claims()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_count integer := 0;
  policy_record RECORD;
  weather_record RECORD;
BEGIN
  -- Loop through all active policies
  FOR policy_record IN
    SELECT
      up.id as policy_id,
      up.user_id,
      up.farm_id,
      up.coverage_amount,
      up.claim_status,
      up.end_date
    FROM user_policies up
    WHERE up.payment_status = 'Paid'
    AND up.claim_status = 'None'
    AND up.end_date >= now()
  LOOP
    -- Get average weather data for the last 7 days
    SELECT
      AVG(rainfall_mm) as avg_rainfall,
      MAX(temperature_c) as max_temp
    INTO weather_record
    FROM weather_observations
    WHERE farm_id = policy_record.farm_id
    AND timestamp >= now() - interval '7 days';

    -- Check for low rainfall trigger
    IF weather_record.avg_rainfall < 10 THEN
      INSERT INTO claims (user_policy_id, reason, amount_claimed, status)
      VALUES (
        policy_record.policy_id,
        'Low rainfall detected (< 10mm avg in 7 days)',
        policy_record.coverage_amount,
        'Pending'
      );

      UPDATE user_policies
      SET claim_status = 'Pending'
      WHERE id = policy_record.policy_id;

      result_count := result_count + 1;
    END IF;

    -- Check for high temperature trigger
    IF weather_record.max_temp > 45 THEN
      INSERT INTO claims (user_policy_id, reason, amount_claimed, status)
      VALUES (
        policy_record.policy_id,
        'Extreme temperature detected (> 45°C)',
        policy_record.coverage_amount,
        'Pending'
      );

      UPDATE user_policies
      SET claim_status = 'Pending'
      WHERE id = policy_record.policy_id;

      result_count := result_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'claims_created', result_count,
    'timestamp', now()
  );
END;
$$;

-- =====================================================
-- SEED DATA (Optional - for testing)
-- =====================================================

-- Note: You'll need to create users first through the Supabase Auth UI
-- Then link them to user_profiles with matching IDs

-- Example: After creating auth users, insert profile data
-- INSERT INTO user_profiles (id, full_name, email, role)
-- VALUES
--   ('your-auth-user-id-1', 'Admin User', 'admin@example.com', 'admin'),
--   ('your-auth-user-id-2', 'Insurer User', 'insurer@example.com', 'insurer'),
--   ('your-auth-user-id-3', 'Farmer User', 'farmer@example.com', 'farmer');

-- =====================================================
-- COMPLETE!
-- =====================================================
