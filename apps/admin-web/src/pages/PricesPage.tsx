/**
 * Price management.
 *
 * Rules PRICE-01/05 and HON-01:
 *   - every price record carries the source it came from, and the source is
 *     required, not optional
 *   - stale prices are flagged rather than silently used
 *   - nothing on this screen is a real market rate
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Locale, Material, PriceBoardRow } from '@rescrap/shared';
import { session } from '../lib/session';
import { formatDate, formatMoney } from '../lib/format';
import {
  Badge,
  Card,
  DemoBoundary,
  DemoTag,
  Empty,
  ErrorNotice,
  Loading,
  Td,
  Table,
} from '../components/ui';

const getMaterialImage = (name: string, id: string): string => {
  const lower = `${name} ${id}`.toLowerCase();
  if (lower.includes('copper') || lower.includes('wire')) return '/assets/mat-copper.jpg';
  if (lower.includes('phone') || lower.includes('mobile')) return '/assets/mat-phones.jpg';
  if (lower.includes('aluminium') || lower.includes('heatsink')) return '/assets/mat-aluminium.jpg';
  return '/assets/mat-motherboard.jpg';
};

/** Localised labels are stored per locale; the console reads the English one. */
function labelOf(label: Record<Locale, string>): string {
  return label.en ?? Object.values(label)[0] ?? '-';
}

export function PricesPage() {
  const [board, setBoard] = useState<PriceBoardRow[] | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    materialId: '',
    area: 'Pune - Hadapsar',
    rupees: '',
    effectiveFrom: new Date().toISOString(),
    sourceLabel: '',
  });

  const load = useCallback(async () => {
    try {
      const [boardEnvelope, materialEnvelope] = await Promise.all([
        session.client.priceBoard(),
        session.client.request<Material[]>('/materials'),
      ]);
      setBoard(boardEnvelope.data);
      setMaterials(materialEnvelope.data);
      setForm((current) => ({
        ...current,
        materialId: current.materialId || materialEnvelope.data[0]?.id || '',
      }));
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const rupees = Number.parseFloat(form.rupees);
      if (!Number.isFinite(rupees) || rupees <= 0) {
        throw new Error('Enter a price per kilogram greater than zero.');
      }
      const result = await session.client.recordPrice({
        materialId: form.materialId,
        area: form.area.trim(),
        buyingPricePerKg: Math.round(rupees * 100),
        effectiveFrom: new Date(form.effectiveFrom).toISOString(),
        sourceLabel: form.sourceLabel.trim(),
      });
      setNotice(
        `Recorded ${formatMoney(result.data.buyingPricePerKg)} per kg for ${labelOf(
          materials.find((material) => material.id === form.materialId)?.label ?? {
            en: form.materialId,
            hi: form.materialId,
            mr: form.materialId,
          },
        )}, source "${result.data.sourceLabel}".`,
      );
      setForm((current) => ({ ...current, rupees: '', sourceLabel: '' }));
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (error && !board) {
    return <ErrorNotice error={error} />;
  }
  if (!board) {
    return <Loading label="Loading price board..." />;
  }

  return (
    <DemoBoundary isDemo={board.every((row) => row.demo)}>
      <div className="flex flex-col gap-4 text-[#F5EFE6]">
        {notice ? (
          <p role="status" className="rounded-xl border border-[#2FBF71]/40 bg-[#163324] px-4 py-2.5 text-xs text-[#4FD68C] font-medium">
            {notice}
          </p>
        ) : null}
        {error ? <ErrorNotice error={error} /> : null}

        <Card
          title="Price board"
          subtitle="Buying price per kilogram. These are seeded demo figures, not market rates."
          action={<DemoTag label="DEMO PRICES" />}
        >
          {board.length === 0 ? (
            <Empty>No price records yet.</Empty>
          ) : (
            <Table head={['Material', 'Category id', 'Buying price / kg', 'Effective from', 'Source', 'State', 'Hazards']}>
              {board.map((row) => {
                const label = labelOf(row.materialLabel);
                const img = getMaterialImage(label, row.materialId);
                return (
                  <tr key={`${row.materialId}-${row.effectiveFrom}`} className="hover:bg-[#163324]/40 transition-colors">
                    <Td>
                      <div className="flex items-center gap-3">
                        <img
                          src={img}
                          alt={label}
                          className="w-10 h-10 rounded-xl object-cover border border-[#1E3A2B] shrink-0"
                        />
                        <div>
                          <span className="text-sm font-bold text-white">{label}</span>
                          <p className="font-mono text-[10px] text-stone-400">{row.materialId}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs text-stone-400">{row.materialId.split('_')[1]}</Td>
                    <Td className="font-mono font-bold text-white tabular-nums text-sm">
                      {formatMoney(row.buyingPricePerKg)}
                    </Td>
                    <Td className="text-xs whitespace-nowrap text-stone-400 font-mono">
                      {formatDate(row.effectiveFrom)}
                    </Td>
                    <Td className="text-xs text-stone-400">Seeded demo baseline</Td>
                    <Td>
                      {row.stale ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/40 text-rose-300 border border-rose-800/40" title="Older than the staleness window">
                          Stale
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/30">
                          Current
                        </span>
                      )}
                    </Td>
                    <Td>
                      {row.hazardFlags.length === 0 ? (
                        <span className="text-xs text-stone-500 font-mono">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.hazardFlags.map((flag) => (
                            <Badge key={flag} tone="bg-amber-950/40 text-amber-300 border-amber-600/40" title="Safe handling required">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>

        <Card
          title="Record a price"
          subtitle="A source is mandatory (PRICE-05). A price with no origin is not a price."
        >
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-300">
              <span className="font-medium">Material</span>
              <select
                value={form.materialId}
                onChange={(event) => setForm({ ...form, materialId: event.target.value })}
                required
                className="mt-1 w-full rounded-xl border border-[#1E3A2B] bg-[#0C1A14] px-3 py-2 text-sm text-white focus:border-[#2FBF71] focus:ring-1 focus:ring-[#2FBF71] focus:outline-none"
              >
                {materials.map((material) => (
                  <option key={material.id} value={material.id} className="bg-[#0C1A14] text-white">
                    {labelOf(material.label)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-mono uppercase tracking-wider text-stone-300">
              <span className="font-medium">Area</span>
              <input
                value={form.area}
                onChange={(event) => setForm({ ...form, area: event.target.value })}
                required
                className="mt-1 w-full rounded-xl border border-[#1E3A2B] bg-[#0C1A14] px-3 py-2 text-sm text-white focus:border-[#2FBF71] focus:ring-1 focus:ring-[#2FBF71] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-mono uppercase tracking-wider text-stone-300">
              <span className="font-medium">Buying price per kg (INR)</span>
              <input
                value={form.rupees}
                onChange={(event) => setForm({ ...form, rupees: event.target.value })}
                inputMode="decimal"
                placeholder="e.g. 42.50"
                required
                className="mt-1 w-full rounded-xl border border-[#1E3A2B] bg-[#0C1A14] px-3 py-2 text-sm text-white font-mono focus:border-[#2FBF71] focus:ring-1 focus:ring-[#2FBF71] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-mono uppercase tracking-wider text-stone-300">
              <span className="font-medium">Effective from</span>
              <input
                type="datetime-local"
                value={form.effectiveFrom.slice(0, 16)}
                onChange={(event) =>
                  setForm({ ...form, effectiveFrom: new Date(event.target.value).toISOString() })
                }
                required
                className="mt-1 w-full rounded-xl border border-[#1E3A2B] bg-[#0C1A14] px-3 py-2 text-sm text-white font-mono focus:border-[#2FBF71] focus:ring-1 focus:ring-[#2FBF71] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 sm:col-span-2">
              <span className="font-medium">Source (required)</span>
              <input
                value={form.sourceLabel}
                onChange={(event) => setForm({ ...form, sourceLabel: event.target.value })}
                placeholder="Where this number came from"
                required
                minLength={2}
                className="mt-1 w-full rounded-xl border border-[#1E3A2B] bg-[#0C1A14] px-3 py-2 text-sm text-white focus:border-[#2FBF71] focus:ring-1 focus:ring-[#2FBF71] focus:outline-none"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] px-5 py-2.5 text-xs font-extrabold text-[#07130D] hover:brightness-110 active:brightness-95 disabled:opacity-50 transition-all shadow-md"
              >
                {busy ? 'Recording...' : 'Record Price Baseline'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </DemoBoundary>
  );
}
