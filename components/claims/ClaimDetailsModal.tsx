'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface EvidenceFile {
  id: string;
  storage_path: string;
  file_type: string;
  publicUrl: string | null;
}

interface ClaimWithDetails {
  id: string;
  triggered_at: string;
  reason: string;
  amount_claimed: number;
  status: string;
  user_policies: {
    user_profiles: { full_name: string };
    policy_products: { name: string };
  };
}

interface ClaimDetailsModalProps {
  claim: ClaimWithDetails | null;
  onClose: () => void;
}

export function ClaimDetailsModal({ claim, onClose }: ClaimDetailsModalProps) {
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (!claim) return;

    const fetchEvidence = async () => {
      setLoading(true);
      const { data: records, error } = await supabase
        .from('claim_evidence')
        .select('id, storage_path, file_type')
        .eq('claim_id', claim.id);

      if (error) {
        console.error('Error fetching evidence:', error);
        setLoading(false);
        return;
      }

      const evidenceWithUrls = await Promise.all(
        (records || []).map(async (record) => {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('claim-evidence')
            .createSignedUrl(record.storage_path, 3600);

          if (urlError) {
            console.error('Error creating signed URL:', urlError.message);
            return { ...record, publicUrl: null };
          }

          return { ...record, publicUrl: urlData.signedUrl };
        })
      );

      setEvidence(evidenceWithUrls);
      setLoading(false);
    };

    fetchEvidence();
  }, [claim]);

  if (!claim) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Claim Details</DialogTitle>
          <DialogDescription>
            Reviewing claim for {claim.user_policies.user_profiles.full_name}
          </DialogDescription>
        </DialogHeader>

        {/* Fullscreen Image Overlay */}
        {fullscreenImage && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 left-4 flex items-center text-white gap-2 bg-black/40 px-4 py-2 rounded-full hover:bg-black/70 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <Image
              src={fullscreenImage}
              alt="Full Evidence"
              width={1200}
              height={800}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* LEFT COLUMN — Claim Info */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-slate-500">
                Claim Amount
              </h4>
              <p className="text-2xl font-bold text-slate-900">
                ₹{claim.amount_claimed.toLocaleString()}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-500">Status</h4>
              <Badge>{claim.status}</Badge>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-500">Policy</h4>
              <p>{claim.user_policies.policy_products.name}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-500">Reason</h4>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-md">
                {claim.reason}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-500">
                Claim Date
              </h4>
              <p>{format(new Date(claim.triggered_at), 'MMM dd, yyyy HH:mm')}</p>
            </div>
          </div>

          {/* RIGHT COLUMN — Evidence */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-slate-500">
              Submitted Evidence
            </h4>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : evidence.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No evidence was submitted.
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {evidence.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-md overflow-hidden border cursor-pointer hover:shadow-md transition"
                  >
                    {file.publicUrl ? (
                      file.file_type.startsWith('image/') ? (
                        <Image
                          src={file.publicUrl}
                          alt="Claim evidence"
                          width={600}
                          height={400}
                          className="w-full h-[250px] object-cover"
                          onClick={() => setFullscreenImage(file.publicUrl!)}
                        />
                      ) : file.file_type.startsWith('video/') ? (
                        <video
                          src={file.publicUrl}
                          controls
                          className="w-full h-[250px]"
                        />
                      ) : (
                        <a
                          href={file.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 block text-blue-600 hover:underline"
                        >
                          View File: {file.storage_path.split('/').pop()}
                        </a>
                      )
                    ) : (
                      <p className="p-3 text-red-500">Could not load file.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
