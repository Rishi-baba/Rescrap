/**
 * Exceptions: anomaly flags and AI output records.
 *
 * The predictions panel is the most misreadable screen in any dashboard, so
 * the limits sit in the same place as the numbers (rules AI-01/AI-02): these
 * are seeded, rule-derived outputs, and every one carries the method and
 * confidence that produced it. No model accuracy claim appears anywhere.
 */
import { useEffect, useState } from 'react';
import type { AiPrediction } from '@rescrap/shared';
import { session } from '../lib/session';
import { formatDateTime } from '../lib/format';
import {
  Card,
  DemoBoundary,
  DemoTag,
  Empty,
  ErrorNotice,
  Loading,
  SeverityPill,
  Stat,
  Td,
  Table,
} from '../components/ui';

interface AnomalyFlag {
  lotId?: string;
  code: string;
  severity: string;
  message: string;
}

function confidenceTone(confidence: number): string {
  if (confidence >= 0.8) {
    return 'bg-[#163324] text-[#4FD68C] border-[#2FBF71]/30';
  }
  if (confidence >= 0.5) {
    return 'bg-amber-950/40 text-amber-300 border-amber-600/40';
  }
  return 'bg-rose-950/40 text-rose-300 border-rose-800/40';
}

export function ExceptionsPage() {
  const [flags, setFlags] = useState<AnomalyFlag[] | null>(null);
  const [predictions, setPredictions] = useState<AiPrediction[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let live = true;
    Promise.all([
      session.client.anomalies(),
      session.client.request<AiPrediction[]>('/admin/ai-predictions'),
    ])
      .then(([flagEnvelope, predictionEnvelope]) => {
        if (live) {
          setFlags(flagEnvelope.data);
          setPredictions(predictionEnvelope.data);
        }
      })
      .catch((err: unknown) => {
        if (live) {
          setError(err);
        }
      });
    return () => {
      live = false;
    };
  }, []);

  if (error && !flags) {
    return <ErrorNotice error={error} />;
  }
  if (!flags || !predictions) {
    return <Loading label="Loading exceptions..." />;
  }

  const high = flags.filter(
    (flag) => flag.severity.toUpperCase() === 'HIGH' || flag.severity.toUpperCase() === 'CRITICAL',
  ).length;
  const corrected = predictions.filter((prediction) => prediction.correctedAt).length;
  const modelBacked = predictions.filter((prediction) => prediction.method === 'model').length;

  return (
    <div className="flex flex-col gap-4 text-[#F5EFE6]">
      {error ? <ErrorNotice error={error} /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total flags" value={String(flags.length)} />
        <Stat label="High severity" value={String(high)} tone={high > 0 ? 'text-rose-400' : 'text-white'} />
        <Stat
          label="AI outputs logged"
          value={String(predictions.length)}
          hint={`${corrected} corrected by a human`}
        />
        <Stat
          label="Model-backed outputs"
          value={String(modelBacked)}
          hint={modelBacked === 0 ? 'All outputs are rule-derived' : 'A trained model is in use'}
        />
      </div>

      <Card
        title="Anomaly flags"
        subtitle="Raised by the rule engine. A flag draws attention; it does not silently change a lot's state."
        action={<DemoTag label="RULE ENGINE" />}
      >
        {flags.length === 0 ? (
          <Empty>No anomalies detected in the current data.</Empty>
        ) : (
          <Table head={['Severity', 'Code', 'Lot', 'Explanation']}>
            {flags.map((flag) => (
              <tr key={`${flag.lotId}-${flag.code}`} className="hover:bg-[#163324]/40 transition-colors">
                <Td>
                  <SeverityPill severity={flag.severity} />
                </Td>
                <Td className="font-mono text-xs font-bold text-white">{flag.code}</Td>
                <Td className="font-mono text-xs text-[#4FD68C]">{flag.lotId ?? '-'}</Td>
                <Td className="text-sm text-stone-300">{flag.message}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card
        title="AI output log"
        subtitle="Every automated suggestion the system made, with the method that produced it."
        action={<DemoTag label="RULE DERIVED" />}
      >
        <p className="mb-4 rounded-2xl border border-amber-600/40 bg-amber-950/40 p-3.5 text-xs text-amber-300">
          <strong className="text-amber-200">No trained model is running in this build.</strong> Each row shows the capability,
          the method that produced it, and the confidence the system assigned. Confidence is
          reported, never invented, and no accuracy claim is made.
        </p>
        {predictions.length === 0 ? (
          <Empty>No automated outputs have been recorded yet.</Empty>
        ) : (
          <Table head={['Capability', 'Method', 'Result', 'Confidence', 'Applied to', 'Corrected', 'When']}>
            {predictions.map((prediction) => (
              <tr key={prediction.id} className="hover:bg-[#163324]/40 transition-colors">
                <Td className="text-xs font-mono font-semibold text-white">{prediction.capability.replace(/_/g, ' ')}</Td>
                <Td>
                  <DemoTag label={prediction.method.toUpperCase()} />
                  {prediction.modelVersion ? (
                    <p className="mt-0.5 font-mono text-[10px] text-stone-500">{prediction.modelVersion}</p>
                  ) : null}
                </Td>
                <Td className="text-sm text-stone-300">{prediction.result}</Td>
                <Td>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-mono font-bold tabular-nums border ${confidenceTone(prediction.confidence)}`}
                  >
                    {(prediction.confidence * 100).toFixed(0)}%
                  </span>
                </Td>
                <Td className="font-mono text-[11px] text-[#4FD68C]">
                  {prediction.lotId ?? prediction.lotItemId ?? '-'}
                </Td>
                <Td className="text-xs">
                  {prediction.correctedAt ? (
                    <span className="text-amber-400 font-mono text-[11px]">Yes, by human</span>
                  ) : (
                    <span className="text-stone-500 font-mono text-[11px]">Not corrected</span>
                  )}
                </Td>
                <Td className="text-xs whitespace-nowrap text-stone-400 font-mono">
                  {formatDateTime(prediction.createdAt)}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <DemoBoundary isDemo={predictions.every((prediction) => prediction.demo)}>
        <p className="text-xs text-stone-500 font-mono">
          This screen reports what the system did, so an operator can audit it. It does not
          forecast demand: no demand model exists in this build.
        </p>
      </DemoBoundary>
    </div>
  );
}
