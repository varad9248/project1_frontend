import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
    "1h"?: number;
  };
}

// This function will be called by the cron job
export async function GET(request: Request) {
  // --- 1. Get All Secrets (MUST be set in your Vercel/deployment) ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Key for admin access
  const cronSecret = process.env.CRON_SECRET_TOKEN; // A secret password you create

  if (!supabaseUrl || !serviceKey || !cronSecret) {
    return NextResponse.json(
      { error: "Missing environment variables" },
      { status: 500 }
    );
  }

  // --- 2. Secure Your API Route ---
  // We check for a 'secret' in the URL, like: .../api/fetch-weather?secret=MY_SECRET_PASSWORD
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // --- 3. Create Supabase Admin Client ---
    // We use the service_role key to bypass RLS and read all farms
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // --- 4. Get All Farms ---
    const { data: farms, error: farmError } = await supabaseAdmin
      .from("farm_profiles")
      .select("id, location, district");

    if (farmError) throw farmError;

    const newObservations = [];

    // --- 5. Loop Farms & Fetch Weather ---
    for (const farm of farms as FarmProfile[]) {
      // ❗️This is the weak link. See note below.
      const queryLocation = farm.district || farm.location;
      if (!queryLocation) continue;

      try {
      
        const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${queryLocation}&key=${process.env.OPENCAGE_API_KEY}`;
        const geoRes = await fetch(geocodeUrl);
        const geoData = await geoRes.json();
        const { lat, lng } = geoData.results[0].geometry;

        const weatherUrl = `https://api.open-Meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m&daily=precipitation_sum&timezone=auto&past_days=1`;

        const res = await fetch(weatherUrl);

        if (res.ok) {
          const weather = await res.json();
          newObservations.push({
            farm_id: farm.id,
            temperature_c: weather.current.temperature_2m,
            humidity: weather.current.relative_humidity_2m,
            rainfall_mm: weather.daily.precipitation_sum[0] || 0,
          });
        }
      } catch (e) {
        console.error(`Failed to fetch weather for ${queryLocation}:`, e);
      }
    }

    // --- 6. Insert New Data into DB ---
    if (newObservations.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("weather_observations")
        .insert(newObservations);

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      new_records: newObservations.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
