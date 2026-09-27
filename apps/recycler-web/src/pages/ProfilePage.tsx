import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, Badge, StatusPill, LoadingState, ErrorState } from '@rescrap/design-system';
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

  if (isLoading) return <LoadingState label="Loading facility credentials..." />;
  if (error) return <ErrorState message={error} />;
  if (!profile) return null;

  const isVerified = (profile.verificationStatus ?? (profile as any).authorizationStatus) === 'VERIFIED';

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Facility Profile &amp; Authorization</h2>
        <p className="text-xs text-stone-500">
          Official compliance and operational capabilities registered on ReScrap
        </p>
      </div>

      {/* Verification Status Card */}
      <Card variant="elevated">
        <CardBody className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1">
                Facility Name
              </span>
              <h3 className="text-lg font-bold text-stone-900">{profile.businessName}</h3>
              <p className="text-xs text-stone-500 font-mono mt-0.5">ID: {profile.id}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-xs text-stone-400 uppercase font-semibold">Regulatory Status</span>
              {isVerified ? (
                <StatusPill status="success" label="VERIFIED FACILITY" />
              ) : (
                <StatusPill status="warning" label="PENDING VERIFICATION" />
              )}
            </div>
          </div>

          <div className="mt-6 p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-amber-800 mb-0.5">
              Honesty Declaration (Rule HON-01)
            </p>
            <p>
              In this demonstration build, all recycler authorizations are simulated for software
              evaluation. No state or central pollution control board certification is asserted.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Authorized Materials & Operating Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h4 className="text-sm font-bold text-stone-900">Permitted Waste Streams</h4>
          </CardHeader>
          <CardBody className="p-5 flex flex-wrap gap-2">
            {(profile.authorizedMaterials ?? []).length === 0 ? (
              <span className="text-xs text-stone-400 italic">All compliant electronic waste streams</span>
            ) : (
              (profile.authorizedMaterials ?? []).map((mat) => (
                <Badge key={mat} tone="neutral" className="text-xs py-1 px-2.5">
                  {mat}
                </Badge>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h4 className="text-sm font-bold text-stone-900">Active Collection Regions</h4>
          </CardHeader>
          <CardBody className="p-5 flex flex-wrap gap-2">
            {(profile.serviceAreas ?? []).length === 0 ? (
              <span className="text-xs text-stone-400 italic">Pune Metro Region</span>
            ) : (
              (profile.serviceAreas ?? []).map((area) => (
                <Badge key={area} tone="info" className="text-xs py-1 px-2.5">
                  {area}
                </Badge>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Facility Contact & Inspection Address */}
      <Card>
        <CardHeader>
          <h4 className="text-sm font-bold text-stone-900">Facility Location &amp; Dispatch</h4>
        </CardHeader>
        <CardBody className="p-5 flex flex-col gap-3 text-xs text-stone-700">
          <div>
            <span className="text-stone-400 font-semibold block uppercase tracking-wider text-[10px]">
              Dispatch Contact
            </span>
            <span className="font-medium text-stone-900 font-mono text-sm">
              {profile.contactPhone || (profile as any).phone || '+91 90000 00002'}
            </span>
          </div>
          <div>
            <span className="text-stone-400 font-semibold block uppercase tracking-wider text-[10px]">
              Registered Physical Facility
            </span>
            <span className="font-medium text-stone-900">
              {profile.facilityAddress || 'MIDC Industrial Area, Phase II, Hadapsar, Pune - 411028'}
            </span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
