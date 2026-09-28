import React, { useEffect, useState } from 'react';
import { Button, LoadingState, ErrorState, PriceDisplay } from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerTransactionItem } from '../lib/api.js';

export const TransactionsPage: React.FC = () => {
  const [txns, setTxns] = useState<readonly RecyclerTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTxns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await recyclerSession.client.listTransactions();
      setTxns(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load completed transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTxns();
  }, []);

  return (
    <div className="flex flex-col gap-6 text-[#F5EFE6]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
            Immutable Traceability Ledger &bull; ESG Provenance
          </span>
          <h2 className="text-2xl font-black text-white mt-0.5">Transaction History &amp; Traceability</h2>
          <p className="text-xs text-stone-400 mt-1">
            Immutable records of finalized custody transfers, simulated payouts and ESG compliance hashes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTxns}>
          Refresh Ledger
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading immutable transaction ledger..." className="py-16 text-stone-300" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadTxns} />
      ) : txns.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#12231B] border border-[#1E3A2B]">
          <p className="text-sm font-semibold text-white">No completed transactions yet.</p>
          <p className="text-xs text-stone-400 mt-1">
            Completed handovers with verified collector sign-off will record here permanently.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#1E3A2B] bg-[#12231B] shadow-xl">
          <table className="w-full text-left text-sm text-stone-300 divide-y divide-[#1E3A2B]">
            <thead className="bg-[#0C1A14] text-[10px] uppercase font-mono font-bold text-stone-400 tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Transaction ID</th>
                <th className="px-5 py-3.5">Lot ID</th>
                <th className="px-5 py-3.5">Material</th>
                <th className="px-5 py-3.5">Reconciled Weight</th>
                <th className="px-5 py-3.5 text-right">Settled Value</th>
                <th className="px-5 py-3.5">Settlement</th>
                <th className="px-5 py-3.5">Traceability Hash</th>
                <th className="px-5 py-3.5">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A2B]/60 bg-[#12231B]">
              {txns.map((txn) => (
                <tr key={txn.id} className="hover:bg-[#163324]/40 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-stone-400">{txn.id}</td>
                  <td className="px-5 py-4 font-mono text-xs text-[#4FD68C]">{txn.lotId}</td>
                  <td className="px-5 py-4 font-bold text-white">{txn.materialName}</td>
                  <td className="px-5 py-4 font-mono font-bold text-white tabular-nums">
                    {txn.finalWeightKg} kg
                  </td>
                  <td className="px-5 py-4 text-right">
                    <PriceDisplay paise={txn.finalAmountPaise} size="sm" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/40">
                        CONFIRMED
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-600/40">
                        SIMULATED
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] text-[#4FD68C] truncate max-w-[140px]" title={txn.traceabilityHash}>
                    {txn.traceabilityHash}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-stone-400">
                    {new Date(txn.completedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
