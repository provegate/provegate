import * as React from 'react';

/** The ProveGate icon set — one geometric single-weight family. `human` vs
 * `machine` are the two distinct gate authorities and must stay visually
 * separate. Add glyphs here in the same 24/2/round style, never an external
 * icon pack. */
export type IconName =
  | 'gate'
  | 'check'
  | 'cross'
  | 'pending'
  | 'human'
  | 'machine'
  | 'lock'
  | 'exit0'
  | 'merge'
  | 'terminal'
  | 'copy'
  | 'arrowRight'
  | 'chevronRight'
  | 'github';

const PATHS: Record<IconName, React.ReactNode> = {
  gate: (
    <>
      <path d="M5 3v18M19 3v18" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  cross: <path d="M6 6l12 12M18 6L6 18" />,
  pending: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  human: (
    <>
      <circle cx="12" cy="7" r="3" fill="none" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </>
  ),
  machine: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="1.5" fill="none" />
      <path d="M7 10l2.5 2L7 14M12.5 14H16" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="1.5" fill="none" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  exit0: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="none" />
      <ellipse cx="12" cy="12" rx="3" ry="4.5" fill="none" />
    </>
  ),
  merge: (
    <>
      <circle cx="6" cy="6" r="2.4" fill="none" />
      <circle cx="6" cy="18" r="2.4" fill="none" />
      <circle cx="18" cy="12" r="2.4" fill="none" />
      <path d="M6 8.4v7.2M8.2 6.9c1.2 4 4 4.8 7.4 5" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" fill="none" />
      <path d="M7 9l3 3-3 3M13 15h4" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="1.5" fill="none" />
      <path d="M5 15V5a1.5 1.5 0 0 1 1.5-1.5H15" />
    </>
  ),
  arrowRight: <path d="M4 12h15M13 6l6 6-6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  github: (
    <path
      d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"
      strokeWidth={0}
      fill="currentColor"
    />
  ),
};

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  title?: string;
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  title,
  ...rest
}: IconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
