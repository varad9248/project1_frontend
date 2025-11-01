'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Plus, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { PolicyProduct } from '@/lib/supabase';

export default function SettingsPage() {
  const [policies, setPolicies] = useState<PolicyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyProduct | null>(null);
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    crop_type: '',
    season: '',
    base_premium: '',
    coverage_amount: '',
    duration_months: '6',
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('policy_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Failed to load policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      crop_type: '',
      season: '',
      base_premium: '',
      coverage_amount: '',
      duration_months: '6',
    });
    setEditingPolicy(null);
  };

  const handleEdit = (policy: PolicyProduct) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      crop_type: policy.crop_type,
      season: policy.season,
      base_premium: policy.base_premium.toString(),
      coverage_amount: policy.coverage_amount.toString(),
      duration_months: policy.duration_months.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const { error } = await supabase
        .from('policy_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Policy deleted successfully');
      loadPolicies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete policy');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const policyData = {
        name: formData.name,
        description: formData.description,
        crop_type: formData.crop_type,
        season: formData.season,
        base_premium: parseFloat(formData.base_premium),
        coverage_amount: parseFloat(formData.coverage_amount),
        duration_months: parseInt(formData.duration_months),
        insurer_id: user?.id,
      };

      if (editingPolicy) {
        const { error } = await supabase
          .from('policy_products')
          .update(policyData)
          .eq('id', editingPolicy.id);

        if (error) throw error;
        toast.success('Policy updated successfully');
      } else {
        const { error } = await supabase
          .from('policy_products')
          .insert(policyData);

        if (error) throw error;
        toast.success('Policy created successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadPolicies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save policy');
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'insurer') {
    return (
      <div className="space-y-6">
        <Card className="shadow-lg border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-8 w-8 text-slate-600" />
            Settings
          </h1>
          <p className="text-slate-600 mt-1">Manage policy catalog and system settings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
                </DialogTitle>
                <DialogDescription>
                  {editingPolicy ? 'Update policy details below' : 'Add a new insurance policy to the catalog'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Policy Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="crop_type">Crop Type</Label>
                    <Input
                      id="crop_type"
                      value={formData.crop_type}
                      onChange={(e) => setFormData({ ...formData, crop_type: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="season">Season</Label>
                    <Input
                      id="season"
                      value={formData.season}
                      onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="base_premium">Base Premium (₹)</Label>
                    <Input
                      id="base_premium"
                      type="number"
                      step="0.01"
                      value={formData.base_premium}
                      onChange={(e) => setFormData({ ...formData, base_premium: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="coverage_amount">Coverage Amount (₹)</Label>
                    <Input
                      id="coverage_amount"
                      type="number"
                      step="0.01"
                      value={formData.coverage_amount}
                      onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration_months">Duration (Months)</Label>
                  <Input
                    id="duration_months"
                    type="number"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Policy Catalog</CardTitle>
            <CardDescription>{policies.length} insurance policies available</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Crop Type</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Loading policies...
                      </TableCell>
                    </TableRow>
                  ) : policies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No policies found. Create your first policy!
                      </TableCell>
                    </TableRow>
                  ) : (
                    policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">{policy.name}</TableCell>
                        <TableCell>{policy.crop_type}</TableCell>
                        <TableCell>{policy.season}</TableCell>
                        <TableCell>₹{policy.base_premium.toLocaleString()}</TableCell>
                        <TableCell>₹{policy.coverage_amount.toLocaleString()}</TableCell>
                        <TableCell>{policy.duration_months} months</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(policy)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(policy.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
