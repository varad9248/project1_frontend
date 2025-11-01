'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/lib/store';
import {
  LayoutDashboard,
  FileText,
  AlertCircle,
  Users,
  Settings,
  CloudRain,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Policies',
    href: '/dashboard/policies',
    icon: FileText,
  },
  {
    title: 'Claims',
    href: '/dashboard/claims',
    icon: AlertCircle,
  },
  {
    title: 'Farmers',
    href: '/dashboard/farmers',
    icon: Users,
  },
  {
    title: 'Automation',
    href: '/dashboard/automation',
    icon: CloudRain,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useDashboardStore();

  return (
    <motion.aside
      initial={{ x: 0 }}
      animate={{ x: sidebarOpen ? 0 : -280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-slate-200 bg-white z-40"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-emerald-600' : 'text-slate-600')} />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-slate-200 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-start text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Collapse sidebar
          </Button>
        </div>
      </div>
    </motion.aside>
  );
}
