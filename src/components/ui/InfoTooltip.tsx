import type React from 'react';

interface InfoTooltipProps {
  text: string;
  children?: React.ReactNode;
}

export default function InfoTooltip({ text, children }: InfoTooltipProps) {
  return (
    <div className="tooltip" data-tip={text}>
      {children ?? (
        <button type="button" className="btn btn-ghost btn-circle btn-xs" aria-label={text}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
