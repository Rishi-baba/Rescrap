import React from 'react';
import { type SemanticStatus, semanticStatusStyles } from '../tokens/colors.js';

export interface StatusPillProps {
  status: SemanticStatus;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  icon,
  className = '',
}) => {
  const styles = semanticStatusStyles[status];

  return (
    <span
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        borderColor: styles.border,
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}
    >
      {icon ? (
        <span className="shrink-0 text-current">{icon}</span>
      ) : (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: styles.dotColor }}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};
