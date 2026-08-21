import type { CSSProperties } from 'react';

const FILES: Record<string, string> = {
  full: 'logo-madli-full.png',
  lockup: 'logo-madli-full.png',
  mark: 'logo-mark-transparent.png',
  wordmark: 'logo-wordmark-transparent.png',
  tagline: 'logo-tagline-transparent.png',
};

export interface LogoProps {
  variant?: 'full' | 'lockup' | 'mark' | 'wordmark' | 'tagline';
  height?: number;
  /** path from this page to the design system's /assets folder */
  assetBase?: string;
  style?: CSSProperties;
}

/** The Madli mark, from the supplied artwork. Never redrawn or recoloured. */
export function Logo({
  variant = 'wordmark',
  height = 28,
  assetBase = '/design-system/assets',
  style,
}: LogoProps) {
  const file = FILES[variant] ?? FILES.wordmark;
  return (
    <img
      src={`${assetBase.replace(/\/$/, '')}/${file}`}
      alt="Madli"
      style={{ height, width: 'auto', display: 'block', ...style }}
    />
  );
}
