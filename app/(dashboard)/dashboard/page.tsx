'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, AlertCircle, CheckCircle, CloudRain, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [policiesRes, farmersRes, claimsRes, weatherRes] = await Promise.all([
        supabase.from('user_policies').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'farmer'),
        supabase.from('claims').select('status'),
        supabase.from('weather_observations').select('*').gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const claimsByStatus = claimsRes.data?.reduce((acc, claim) => {
        acc[claim.status] = (acc[claim.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const criticalWeather = weatherRes.data?.filter(
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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimsData = [
    { name: 'Jan', claims: 12 },
    { name: 'Feb', claims: 19 },
    { name: 'Mar', claims: 15 },
    { name: 'Apr', claims: 25 },
    { name: 'May', claims: 22 },
    { name: 'Jun', claims: 30 },
  ];

  const statusData = [
    { name: 'Pending', value: stats.pendingClaims, color: '#f59e0b' },
    { name: 'Approved', value: stats.approvedClaims, color: '#10b981' },
    { name: 'Paid', value: stats.paidClaims, color: '#3b82f6' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Welcome to Agri-Shield Insurance Portal</p>
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
              <CardDescription>Monthly claims over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={claimsData}>
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
              <CardDescription>Current distribution of claim statuses</CardDescription>
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
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
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
              {stats.weatherAlerts} critical weather conditions detected in the last 7 days
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    </div>
  );
}
