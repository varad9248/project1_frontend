'use client';

import { useEffect, useState } from 'react';
import { weatherService } from '@/lib/weather';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CloudRain, Play, Loader2, TrendingDown, TrendingUp, Thermometer, Droplets } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface WeatherData {
  id: string;
  farm_id: string;
  timestamp: string;
  rainfall_mm: number;
  temperature_c: number;
  humidity: number;
  farm_profiles: {
    farm_name: string;
    location: string;
  };
}

interface AutomationResult {
  success: boolean;
  claims_created: number;
  timestamp: string;
}

export default function AutomationPage() {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<AutomationResult | null>(null);

  useEffect(() => {
    loadWeatherData();
  }, []);

  const loadWeatherData = async () => {
    try {
      const data = await weatherService.getAllRecentWeatherObservations(20);
      setWeatherData(data as any);
    } catch (error) {
      console.error('Failed to load weather data:', error);
      toast.error('Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  const runClaimCheck = async () => {
    setRunning(true);
    try {
      const result = await weatherService.runAutomatedClaimCheck();
      setLastRun(result);
      toast.success(`Automation completed: ${result.claims_created} claims created`);
      
      // Reload weather data to show updated status
      await loadWeatherData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to run automation');
      setLastRun({
        success: false,
        claims_created: 0,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setRunning(false);
    }
  };

  const getWeatherAlert = (observation: WeatherData) => {
    const alerts = [];
    if (observation.rainfall_mm < 10) {
      alerts.push({ type: 'Low Rainfall', severity: 'warning' });
    }
    if (observation.temperature_c > 40) {
      alerts.push({ type: 'High Temperature', severity: 'danger' });
    }
    if (observation.humidity < 30) {
      alerts.push({ type: 'Low Humidity', severity: 'info' });
    }
    return alerts;
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'danger':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-amber-100 text-amber-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <CloudRain className="h-8 w-8 text-blue-600" />
            Automation Monitor
          </h1>
          <p className="text-slate-600 mt-1">Monitor weather data and trigger automated claims</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-lg border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle>Automated Claim Trigger</CardTitle>
              <CardDescription>
                Run claim checks based on weather conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={runClaimCheck}
                disabled={running}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Running Checks...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Run Claim Check
                  </>
                )}
              </Button>

              {lastRun && (
                <div className="p-4 rounded-lg bg-slate-50 border">
                  <h4 className="font-semibold text-sm text-slate-700 mb-2">Last Run</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-slate-600">Status:</span>{' '}
                      <Badge className={lastRun.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                        {lastRun.success ? 'Success' : 'Failed'}
                      </Badge>
                    </p>
                    <p>
                      <span className="text-slate-600">Claims Created:</span>{' '}
                      <span className="font-semibold">{lastRun.claims_created}</span>
                    </p>
                    <p className="text-slate-600">
                      {format(new Date(lastRun.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Weather Thresholds</CardTitle>
              <CardDescription>Conditions that trigger automatic claims</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Droplets className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-sm">Low Rainfall</p>
                      <p className="text-xs text-slate-600">Average over 7 days</p>
                    </div>
                  </div>
                  <span className="font-bold text-amber-700">&lt; 10mm</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-3">
                    <Thermometer className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-sm">High Temperature</p>
                      <p className="text-xs text-slate-600">Maximum temperature</p>
                    </div>
                  </div>
                  <span className="font-bold text-red-700">&gt; 45°C</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Recent Weather Observations</CardTitle>
            <CardDescription>Latest 20 weather readings from all farms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farm</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Rainfall</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Humidity</TableHead>
                    <TableHead>Alerts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Loading weather data...
                      </TableCell>
                    </TableRow>
                  ) : weatherData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No weather data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    weatherData.map((observation) => {
                      const alerts = getWeatherAlert(observation);
                      return (
                        <TableRow key={observation.id}>
                          <TableCell className="font-medium">
                            {observation.farm_profiles.farm_name}
                          </TableCell>
                          <TableCell>{observation.farm_profiles.location}</TableCell>
                          <TableCell>
                            {format(new Date(observation.timestamp), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {observation.rainfall_mm < 10 ? (
                                <TrendingDown className="h-4 w-4 text-amber-600" />
                              ) : (
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                              )}
                              <span>{observation.rainfall_mm.toFixed(1)} mm</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {observation.temperature_c > 40 ? (
                                <TrendingUp className="h-4 w-4 text-red-600" />
                              ) : (
                                <span className="w-4" />
                              )}
                              <span>{observation.temperature_c.toFixed(1)}°C</span>
                            </div>
                          </TableCell>
                          <TableCell>{observation.humidity.toFixed(0)}%</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {alerts.length > 0 ? (
                                alerts.map((alert, idx) => (
                                  <Badge
                                    key={idx}
                                    className={getAlertColor(alert.severity)}
                                  >
                                    {alert.type}
                                  </Badge>
                                ))
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800">
                                  Normal
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
