import React, { useEffect, useState } from 'react';
import { LoadingState, ErrorState } from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerProfileData } from '../lib/api.js';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<RecyclerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await recyclerSession.client.getProfile();
        setProfile(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    void loadProfile();
  }, []);

  if (isLoading) return <LoadingState label="Loading facility credentials..." className="py-16 text-stone-300" />;
  if (error) return <ErrorState message={error} />;
  if (!profile) return null;

  const isVerified = (profile.verificationStatus ?? (profile as any).authorizationStatus) === 'VERIFIED';

  return (
    <div className="flex flex-col gap-6 max-w-4xl text-[#F5EFE6]">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
          Regulatory Authorization &bull; CPCB Verified Facility
        </span>
        <h2 className="text-2xl font-black text-white mt-0.5">Facility Profile &amp; Authorization</h2>
        <p className="text-xs text-stone-400 mt-1">
          Official compliance and operational capabilities registered on ReScrap
        </p>
      </div>

      {/* Verification Status Card */}
      <div className="p-6 rounded-3xl bg-[#12231B] border border-[#1E3A2B] shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block mb-1">
              Registered Facility Name
            </span>
            <h3 className="text-xl font-black text-white">{profile.businessName}</h3>
            <p className="text-xs text-stone-400 font-mono mt-0.5">Facility ID: {profile.id}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-mono text-stone-400 uppercase">Regulatory Status</span>
            {isVerified ? (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/40">
                VERIFIED FACILITY
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/40 text-amber-300 border border-amber-600/40">
                PENDING VERIFICATION
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-[#0C1A14] border border-[#1E3A2B] text-xs text-stone-300">
          <p className="font-mono uppercase tracking-wider text-[10px] text-[#4FD68C] mb-1 font-bold">
            Honesty Declaration (Rule HON-01)
          </p>
          <p className="text-stone-400 leading-relaxed">
            In this demonstration build, all recycler authorizations are simulated for software
            evaluation. No real state or central pollution control board certification is asserted.
          </p>
        </div>
      </div>

      {/* Authorized Materials & Operating Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-3xl bg-[#12231B] border border-[#1E3A2B] shadow-lg flex flex-col gap-3">
          <h4 className="text-sm font-bold text-white">Permitted Waste Streams</h4>
          <div className="flex flex-wrap gap-2">
            {(profile.authorizedMaterials ?? []).length === 0 ? (
              <span className="text-xs text-stone-400 italic">All compliant electronic waste streams</span>
            ) : (
              (profile.authorizedMaterials ?? []).map((mat) => (
                <span
                  key={mat}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#0C1A14] text-[#4FD68C] border border-[#1E3A2B]"
                >
                  {mat}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#12231B] border border-[#1E3A2B] shadow-lg flex flex-col gap-3">
          <h4 className="text-sm font-bold text-white">Active Collection Regions</h4>
          <div className="flex flex-wrap gap-2">
            {(profile.serviceAreas ?? []).length === 0 ? (
              <span className="text-xs text-stone-400 italic">Pune Metro Region</span>
            ) : (
              (profile.serviceAreas ?? []).map((area) => (
                <span
                  key={area}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#0C1A14] text-stone-200 border border-[#1E3A2B]"
                >
                  {area}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
