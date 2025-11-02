import { supabase } from './supabase';

export interface WeatherObservation {
 id: string;
 farm_id: string;
 timestamp: string;
 rainfall_mm: number;
 temperature_c: number;
 humidity: number;
}

export interface WeatherDataInput {
 farm_id: string;
 rainfall_mm?: number;
 temperature_c?: number;
 humidity?: number;
}

export interface AutomationResult {
 success: boolean;
 claims_created: number;
 timestamp: string;
}

export const weatherService = {
 /**
  * Get weather observations for a specific farm
  */
 async getWeatherObservations(
 	farmId: string,
 	limit: number = 20
 ): Promise<WeatherObservation[]> {
 	const { data, error } = await supabase
 	  .from('weather_observations')
 	  .select('*')
 	  .eq('farm_id', farmId)
 	  .order('timestamp', { ascending: false })
 	  .limit(limit);

 	if (error) throw error;
 	return data || [];
 },

 /**
  * Get all recent weather observations
  */
 async getAllRecentWeatherObservations(
 	limit: number = 50
 ): Promise<WeatherObservation[]> {
 	const { data, error } = await supabase
 	  .from('weather_observations')
 	  .select(`
 		*,
 		farm_profiles (farm_name, location)
 	  `)
 	  .order('timestamp', { ascending: false })
 	  .limit(limit);

 	if (error) throw error;
 	return data || [];
 },

 /**
  * Insert weather observation (admin/insurer only)
  */
 async createWeatherObservation(
 	data: WeatherDataInput
 ): Promise<WeatherObservation> {
 	const { data: observation, error } = await supabase
 	  .from('weather_observations')
 	  .insert(data)
 	  .select()
 	  .single();

 	if (error) throw error;
 	return observation;
 },

 /**
  * Bulk insert weather observations (admin/insurer only)
  */
 async createBulkWeatherObservations(
 	observations: WeatherDataInput[]
 ): Promise<WeatherObservation[]> {
 	const { data, error } = await supabase
 	  .from('weather_observations')
 	  .insert(observations)
 	  .select();

 	if (error) throw error;
 	return data || [];
 },

 /**
  * Trigger automated claim check
  * Calls the PostgreSQL function that checks weather conditions
  * against policy thresholds and creates claims
  */
 async runAutomatedClaimCheck(): Promise<AutomationResult> {
 	const { data, error } = await supabase.rpc('check_and_trigger_claims');

 	if (error) {
 	  throw new Error(error.message || 'Failed to run automated claim check');
 	}

 	return data as AutomationResult;
 },

 /**
  * Get weather statistics for a farm over a period
  */
 async getWeatherStats(
 	farmId: string,
 	days: number = 7
 ): Promise<{
 	avgRainfall: number;
 	maxTemperature: number;
 	minTemperature: number;
 	avgHumidity: number;
 }> {
 	const startDate = new Date();
 	startDate.setDate(startDate.getDate() - days);

 	const { data, error } = await supabase
 	  .from('weather_observations')
 	  .select('rainfall_mm, temperature_c, humidity')
 	  .eq('farm_id', farmId)
 	  .gte('timestamp', startDate.toISOString());

 	if (error) throw error;

 	if (!data || data.length === 0) {
 	  return {
 		avgRainfall: 0,
 		maxTemperature: 0,
 		minTemperature: 0,
 		avgHumidity: 0,
 	  };
 	}

 	const rainfall = data
 	  .filter((d) => d.rainfall_mm !== null)
 	  .map((d) => d.rainfall_mm);
 	const temps = data
 	  .filter((d) => d.temperature_c !== null)
 	  .map((d) => d.temperature_c);
 	const humidity = data
 	  .filter((d) => d.humidity !== null)
 	  .map((d) => d.humidity);

 	return {
 	  avgRainfall:
 		rainfall.length > 0
 		  ? rainfall.reduce((a, b) => a + b, 0) / rainfall.length
 		  : 0,
 	  maxTemperature: temps.length > 0 ? Math.max(...temps) : 0,
 	  minTemperature: temps.length > 0 ? Math.min(...temps) : 0,
 	  avgHumidity:
 		humidity.length > 0
 		  ? humidity.reduce((a, b) => a + b, 0) / humidity.length
 		  : 0,
 	};
 },
};