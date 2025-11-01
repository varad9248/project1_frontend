// in app/api/fetch-weather/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Define the types we expect
interface FarmProfile {
  id: string;
  location: string | null;
  district: string | null;
}
interface WeatherResponse {
  main: {
    temp: number;
    humidity: number;
  };
  rain?: {
    '1h'?: number;
  };
}

// This function will be called by the cron job
export async function GET(request: Request) {
  // --- 1. Get All Secrets (MUST be set in your Vercel/deployment) ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Key for admin access
  const weatherApiKey = process.env.OPENWEATHER_API_KEY;
  const cronSecret = process.env.CRON_SECRET_TOKEN; // A secret password you create

  if (!supabaseUrl || !serviceKey || !weatherApiKey || !cronSecret) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
  }

  // --- 2. Secure Your API Route ---
  // We check for a 'secret' in the URL, like: .../api/fetch-weather?secret=MY_SECRET_PASSWORD
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // --- 3. Create Supabase Admin Client ---
    // We use the service_role key to bypass RLS and read all farms
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // --- 4. Get All Farms ---
    const { data: farms, error: farmError } = await supabaseAdmin
      .from('farm_profiles')
      .select('id, location, district');

    if (farmError) throw farmError;

    const newObservations = [];

    // --- 5. Loop Farms & Fetch Weather ---
    for (const farm of farms as FarmProfile[]) {
      const queryLocation = farm.district || farm.location;
      if (!queryLocation) continue; // Skip if no location

      try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${queryLocation}&appid=${weatherApiKey}&units=metric`;
        const res = await fetch(weatherUrl);

        if (res.ok) {
          const weather: WeatherResponse = await res.json();
          newObservations.push({
            farm_id: farm.id,
            temperature_c: weather.main.temp,
            humidity: weather.main.humidity,
            rainfall_mm: weather.rain?.['1h'] || 0,
          });
        }
      } catch (e) {
        console.error(`Failed to fetch weather for ${queryLocation}:`, e);
      }
    }

    // --- 6. Insert New Data into DB ---
    if (newObservations.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('weather_observations')
        .insert(newObservations);
      
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, new_records: newObservations.length });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}