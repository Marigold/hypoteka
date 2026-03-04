import type React from 'react';

type StatColor = 'primary' | 'success' | 'warning' | 'error';

interface ResultCardProps {
  label: string;
  value: React.ReactNode;
  description?: string;
  color?: StatColor;
  className?: string;
}

const colorClasses: Record<StatColor, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export default function ResultCard({
  label,
  value,
  description,
  color,
  className = '',
}: ResultCardProps) {
  const valueClass = color ? colorClasses[color] : '';

  return (
    <div className={`stat ${className}`}>
      <div className="stat-title">{label}</div>
      <div className={`stat-value ${valueClass}`}>{value}</div>
      {description && <div className="stat-desc">{description}</div>}
    </div>
  );
}
