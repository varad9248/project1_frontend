'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, XCircle, Banknote, Search, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClaimDetailsModal } from '@/components/claims/ClaimDetailsModal';

interface ClaimWithDetails {
  id: string;
  triggered_at: string;
  reason: string;
  amount_claimed: number;
  status: string;
  payout_reference_id: string | null;
  user_policies: {
    user_profiles: {
      full_name: string;
      email: string;
    };
    policy_products: {
      name: string;
    };
  };
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<ClaimWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingClaimId, setUpdatingClaimId] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithDetails | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    loadClaims();
    const channel = supabase
      .channel('claims-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => {
        loadClaims();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterClaims();
  }, [searchTerm, claims]);

  const loadClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          user_policies!inner (
            user_profiles!user_policies_user_id_fkey (full_name, email),
            policy_products (name)
          )
        `)
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error('Failed to load claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClaims = () => {
    let filtered = [...claims];
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.user_policies.user_profiles.full_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          c.user_policies.policy_products.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          c.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredClaims(filtered);
  };

  const updateClaimStatus = async (claimId: string, newStatus: string, payoutRef?: string) => {
    setUpdatingClaimId(claimId);
    try {
      const { error } = await supabase.rpc('handle_claim_update', {
        _claim_id: claimId,
        _new_status: newStatus,
        _reviewer_id: user?.id,
        _payout_ref: payoutRef || null,
      });

      if (error) throw error;
      toast.success(`Claim ${newStatus.toLowerCase()} successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update claim');
    } finally {
      setUpdatingClaimId(null);
    }
  };

  const handleApprove = (claimId: string) => updateClaimStatus(claimId, 'Approved');
  const handleReject = (claimId: string) => updateClaimStatus(claimId, 'Rejected');
  const handlePay = (claimId: string) => {
    const payoutRef = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    updateClaimStatus(claimId, 'Paid', payoutRef);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            Claims Management
          </h1>
          <p className="text-slate-600 mt-1">Review and process insurance claims</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Claims</CardTitle>
            <CardDescription>
              {filteredClaims.length} of {claims.length} claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by farmer, policy, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Policy</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Triggered Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payout Ref</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                          Loading claims...
                        </TableCell>
                      </TableRow>
                    ) : filteredClaims.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                          No claims found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClaims.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell>{claim.user_policies.user_profiles.full_name}</TableCell>
                          <TableCell>{claim.user_policies.policy_products.name}</TableCell>
                          <TableCell>{claim.reason}</TableCell>
                          <TableCell>₹{claim.amount_claimed.toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(claim.triggered_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(claim.status)}>{claim.status}</Badge>
                          </TableCell>
                          <TableCell>{claim.payout_reference_id || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedClaim(claim)}
                                className="text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {claim.status === 'Pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleApprove(claim.id)}
                                    disabled={updatingClaimId === claim.id}
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReject(claim.id)}
                                    disabled={updatingClaimId === claim.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {claim.status === 'Approved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePay(claim.id)}
                                  disabled={updatingClaimId === claim.id}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Banknote className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {selectedClaim && <ClaimDetailsModal claim={selectedClaim} onClose={() => setSelectedClaim(null)} />}
    </div>
  );
}
