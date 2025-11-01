'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient: string;
  delay?: number;
}

export function StatsCard({ title, value, icon: Icon, trend, gradient, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-0">
          <div className={`h-full ${gradient} p-6 text-white`}>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-white/80">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
                {trend && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className={trend.isPositive ? 'text-emerald-200' : 'text-red-200'}>
                      {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                    </span>
                    <span className="text-white/60">vs last month</span>
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-white/20 p-3">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
