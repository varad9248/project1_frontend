"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Users, Search, MapPin, Sprout } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface FarmerWithDetails {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  farm_profiles: {
    id: string;
    farm_name: string;
    location: string;
    area: number;
    crop_type: string;
    season: string;
  }[];
}

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<FarmerWithDetails[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<FarmerWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFarmer, setSelectedFarmer] =
    useState<FarmerWithDetails | null>(null);

  const loadFarmers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          `
     *,
     farm_profiles (*)
    `
        )
        .eq("role", "farmer")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFarmers(data || []);
    } catch (error) {
      console.error("Failed to load farmers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFarmers();
  }, [loadFarmers]);

  // Refetch data on window focus
  useEffect(() => {
    const handleFocus = () => {
      loadFarmers();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadFarmers]);

  useEffect(() => {
    filterFarmers();
  }, [searchTerm, farmers]);

  const filterFarmers = () => {
    let filtered = [...farmers];

    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.farm_profiles.some(
            (farm) =>
              farm.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              farm.location.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    setFilteredFarmers(filtered);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-emerald-600" />
            Farmers
          </h1>
          <p className="text-slate-600 mt-1">
            Manage registered farmers and their farms
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
            <CardTitle>All Farmers</CardTitle>
            <CardDescription>
              {filteredFarmers.length} of {farmers.length} farmers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, or farm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Farms</TableHead>
                      <TableHead>Total Area</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-slate-500"
                        >
                          Loading farmers...
                        </TableCell>
                      </TableRow>
                    ) : filteredFarmers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-slate-500"
                        >
                          No farmers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFarmers.map((farmer) => {
                        const totalArea = farmer.farm_profiles.reduce(
                          (sum, farm) => sum + farm.area,
                          0
                        );
                        return (
                          <TableRow
                            key={farmer.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => setSelectedFarmer(farmer)}
                          >
                            <TableCell className="font-medium">
                              {farmer.full_name}
                            </TableCell>
                            <TableCell>{farmer.email}</TableCell>
                            <TableCell>{farmer.phone || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {farmer.farm_profiles.length} farm(s)
                              </Badge>
                            </TableCell>
                            <TableCell>{totalArea.toFixed(2)} acres</TableCell>
                            <TableCell>
                              {format(
                                new Date(farmer.created_at),
                                "MMM dd, yyyy"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {selectedFarmer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-lg border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                {selectedFarmer.full_name}&apos;s Farms
              </CardTitle>
              <CardDescription>
                {selectedFarmer.farm_profiles.length} farm(s) registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedFarmer.farm_profiles.map((farm) => (
                  <Card
                    key={farm.id}
                    className="border-2 hover:border-emerald-200 transition-colors"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sprout className="h-4 w-4 text-emerald-600" />
                        {farm.farm_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4" />
                        <span>{farm.location}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <p className="text-xs text-slate-500">Area</p>
                          <p className="font-semibold">{farm.area} acres</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Crop</p>
                          <Badge variant="outline">{farm.crop_type}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Season</p>
                          <Badge variant="outline">{farm.season}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
