"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Banknote,
  Search,
  Eye,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { ClaimDetailsModal } from "@/components/claims/ClaimDetailsModal";

// ✅ Import Shadcn dialog components
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ClaimWithDetails {
  id: string;
  triggered_at: string;
  reason: string;
  amount_claimed: number;
  status: string;
  payout_reference_id: string | null;
  rejection_reason: string | null;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingClaimId, setUpdatingClaimId] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithDetails | null>(null);

  // ✅ Modal states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { user } = useAuthStore();

  const priorityOrder: Record<string, number> = {
    Pending: 1,
    Approved: 2,
    Paid: 3,
    Rejected: 4,
  };

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("claims")
        .select(
          `
          *,
          user_policies!inner (
            user_profiles!user_policies_user_id_fkey (full_name, email),
            policy_products (name)
          )
        `
        )
        .order("triggered_at", { ascending: false });

      if (error) throw error;

      const sortedData = (data || []).sort(
        (a, b) => priorityOrder[a.status] - priorityOrder[b.status]
      );

      setClaims(sortedData as ClaimWithDetails[]);
      setFilteredClaims(sortedData as ClaimWithDetails[]);
    } catch (error) {
      console.error("Failed to load claims:", error);
      toast.error("Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();

    const channel = supabase
      .channel("claims-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims" },
        () => {
          loadClaims();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadClaims]);

  useEffect(() => {
    const handleFocus = () => {
      loadClaims();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadClaims]);

  useEffect(() => {
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
    filtered.sort((a, b) => priorityOrder[a.status] - priorityOrder[b.status]);
    setFilteredClaims(filtered);
  }, [searchTerm, claims]);

  const updateClaimStatus = async (
    claimId: string,
    newStatus: string,
    details: { payoutRef?: string; rejectionReason?: string } = {}
  ) => {
    setUpdatingClaimId(claimId);
    try {
      const { error } = await supabase.rpc("handle_claim_update", {
        _claim_id: claimId,
        _new_status: newStatus,
        _reviewer_id: user?.id,
        _payout_ref: details.payoutRef || null,
        _rejection_reason: details.rejectionReason || null,
      });

      if (error) throw error;

      toast.success(`Claim ${newStatus.toLowerCase()} successfully`);
      await loadClaims();
    } catch (error: any) {
      toast.error(error.message || "Failed to update claim");
    } finally {
      setUpdatingClaimId(null);
    }
  };

  const handleApprove = (claimId: string) => updateClaimStatus(claimId, "Approved");

  // ✅ Open modal instead of prompt
  const openRejectModal = (claimId: string) => {
    setRejectingClaimId(claimId);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  // ✅ Confirm rejection
  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    if (rejectingClaimId) {
      await updateClaimStatus(rejectingClaimId, "Rejected", {
        rejectionReason: rejectionReason.trim(),
      });
    }
    setRejectModalOpen(false);
    setRejectingClaimId(null);
    setRejectionReason("");
  };

  const handlePay = (claimId: string) => {
    const payoutRef = `PAY-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;
    updateClaimStatus(claimId, "Paid", { payoutRef });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-emerald-100 text-emerald-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
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
          <p className="text-slate-600 mt-1">
            Review and process insurance claims
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
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
                          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
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
                          <TableCell>
                            {claim.user_policies.user_profiles.full_name}
                          </TableCell>
                          <TableCell>
                            {claim.user_policies.policy_products.name}
                          </TableCell>
                          <TableCell>{claim.reason}</TableCell>
                          <TableCell>₹{claim.amount_claimed.toLocaleString()}</TableCell>
                          <TableCell>
                            {format(new Date(claim.triggered_at), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(claim.status)}>
                              {claim.status}
                            </Badge>
                            {claim.status === "Rejected" && claim.rejection_reason && (
                              <p
                                className="text-xs text-red-600 mt-1 max-w-[150px] truncate"
                                title={claim.rejection_reason}
                              >
                                {claim.rejection_reason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {claim.payout_reference_id || "-"}
                          </TableCell>
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

                              {claim.status === "Pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleApprove(claim.id)}
                                    disabled={updatingClaimId === claim.id}
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  >
                                    {updatingClaimId === claim.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4" />
                                    )}
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openRejectModal(claim.id)}
                                    disabled={updatingClaimId === claim.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {claim.status === "Approved" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePay(claim.id)}
                                  disabled={updatingClaimId === claim.id}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  {updatingClaimId === claim.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Banknote className="h-4 w-4" />
                                  )}
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

      {/* ✅ Reject Reason Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this claim.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              disabled={!rejectionReason.trim() || updatingClaimId === rejectingClaimId}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {updatingClaimId === rejectingClaimId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedClaim && (
        <ClaimDetailsModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  );
}
