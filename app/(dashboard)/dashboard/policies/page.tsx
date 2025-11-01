"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search, Eye, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface PolicyWithDetails {
  id: string;
  premium_amount: number;
  coverage_amount: number;
  purchase_date: string;
  payment_status: string;
  claim_status: string;
  user_profiles: {
    full_name: string;
    email: string;
  };
  policy_products: {
    name: string;
    crop_type: string;
  };
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyWithDetails[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<PolicyWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [claimFilter, setClaimFilter] = useState("all");

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    filterPolicies();
  }, [searchTerm, paymentFilter, claimFilter, policies]);

  const loadPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from("user_policies")
        .select(
          `
          *,
          user_profiles!user_policies_user_id_fkey (full_name, email),
          policy_products (name, crop_type)
        `
        )
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error("Failed to load policies:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterPolicies = () => {
    let filtered = [...policies];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.user_profiles.full_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          p.policy_products.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    if (paymentFilter !== "all") {
      filtered = filtered.filter((p) => p.payment_status === paymentFilter);
    }

    if (claimFilter !== "all") {
      filtered = filtered.filter((p) => p.claim_status === claimFilter);
    }

    setFilteredPolicies(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-emerald-100 text-emerald-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "failed":
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
            <FileText className="h-8 w-8 text-emerald-600" />
            Policies
          </h1>
          <p className="text-slate-600 mt-1">Manage all insurance policies</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Policies</CardTitle>
            <CardDescription>
              {filteredPolicies.length} of {policies.length} policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by farmer or policy name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={claimFilter} onValueChange={setClaimFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Claim Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Claims</SelectItem>
                    <SelectItem value="None">No Claim</SelectItem>
                    <SelectItem value="Claim Initiated">
                      Claim Initiated
                    </SelectItem>{" "}
                    <SelectItem value="Claim Paid">Claim Paid</SelectItem>
                    <SelectItem value="Claim Rejected">
                      Claim Rejected
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Policy Name</TableHead>
                      <TableHead>Crop Type</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Claim Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-slate-500"
                        >
                          Loading policies...
                        </TableCell>
                      </TableRow>
                    ) : filteredPolicies.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-slate-500"
                        >
                          No policies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPolicies.map((policy) => (
                        <TableRow key={policy.id}>
                          <TableCell className="font-medium">
                            {policy.user_profiles.full_name}
                          </TableCell>
                          <TableCell>{policy.policy_products.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {policy.policy_products.crop_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            ₹{policy.premium_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            ₹{policy.coverage_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(policy.purchase_date),
                              "MMM dd, yyyy"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusColor(policy.payment_status)}
                            >
                              {policy.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusColor(policy.claim_status)}
                            >
                              {policy.claim_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
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
    </div>
  );
}
