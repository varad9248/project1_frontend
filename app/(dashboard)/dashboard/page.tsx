'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { StatsCard } from '@/components/dashboard/stats-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FileText,
  Users,
  AlertCircle,
  CheckCircle,
  CloudRain,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';

interface DashboardStats {
  totalPolicies: number;
  activeFarmers: number;
  pendingClaims: number;
  approvedClaims: number;
  paidClaims: number;
  weatherAlerts: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPolicies: 0,
    activeFarmers: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    paidClaims: 0,
    weatherAlerts: 0,
  });

  const [claimsTrend, setClaimsTrend] = useState<{ name: string; claims: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [policiesRes, farmersRes, claimsRes, weatherRes] = await Promise.all([
        supabase.from('user_policies').select('*', { count: 'exact', head: true }),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'farmer'),
        supabase.from('claims').select('status, created_at'),
        supabase
          .from('weather_observations')
          .select('*')
          .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Group claims by status
      const claimsByStatus =
        claimsRes.data?.reduce((acc, claim) => {
          acc[claim.status] = (acc[claim.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      // Group claims by month (for trend)
      const claimsByMonth: Record<string, number> = {};
      claimsRes.data?.forEach((c) => {
        const month = new Date(c.created_at).toLocaleString('default', { month: 'short' });
        claimsByMonth[month] = (claimsByMonth[month] || 0) + 1;
      });

      const claimsTrendData = Object.entries(claimsByMonth).map(([month, count]) => ({
        name: month,
        claims: count,
      }));

      const criticalWeather =
        weatherRes.data?.filter(
          (w) => w.rainfall_mm < 10 || w.temperature_c > 40
        ).length || 0;

      setStats({
        totalPolicies: policiesRes.count || 0,
        activeFarmers: farmersRes.count || 0,
        pendingClaims: claimsByStatus['Pending'] || 0,
        approvedClaims: claimsByStatus['Approved'] || 0,
        paidClaims: claimsByStatus['Paid'] || 0,
        weatherAlerts: criticalWeather,
      });

      setClaimsTrend(claimsTrendData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refetch data on window focus
  useEffect(() => {
    const handleFocus = () => {
      loadDashboardData();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadDashboardData]);

  const statusData = [
    { name: 'Pending', value: stats.pendingClaims, color: '#f59e0b' },
    { name: 'Approved', value: stats.approvedClaims, color: '#10b981' },
    { name: 'Paid', value: stats.paidClaims, color: '#3b82f6' },
  ];

  const totalClaims =
    stats.pendingClaims + stats.approvedClaims + stats.paidClaims;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Welcome to Agri-Shield Insurance Portal
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Policies"
          value={stats.totalPolicies}
          icon={FileText}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          trend={{ value: 12.5, isPositive: true }}
          delay={0}
        />
        <StatsCard
          title="Active Farmers"
          value={stats.activeFarmers}
          icon={Users}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          trend={{ value: 8.2, isPositive: true }}
          delay={0.1}
        />
        <StatsCard
          title="Pending Claims"
          value={stats.pendingClaims}
          icon={AlertCircle}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
          delay={0.2}
        />
        <StatsCard
          title="Paid Claims"
          value={stats.paidClaims}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-teal-500 to-teal-600"
          trend={{ value: 15.3, isPositive: true }}
          delay={0.3}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Claims Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Claims Trend
              </CardTitle>
              <CardDescription>
                Monthly claims trend based on creation dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={claimsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="claims"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Claims by Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Claims by Status
              </CardTitle>
              <CardDescription>
                Current distribution of claim statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-sm text-slate-600 mt-3">
                Total Claims: <span className="font-semibold">{totalClaims}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="shadow-lg border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-amber-600" />
              Weather Alerts
            </CardTitle>
            <CardDescription>
              {stats.weatherAlerts} critical weather conditions detected in the
              last 7 days
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    </div>
  );
}
