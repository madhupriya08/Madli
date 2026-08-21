import { useEffect, useState, type CSSProperties } from 'react';

const BASE = 'https://unpkg.com/lucide-static@0.475.0/icons/';
const cache = new Map<string, boolean>();

export interface IconProps {
  /** Lucide icon slug, e.g. "map-pin", "search", "chevron-down" */
  name: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
  /** Accessible name. Omit for a purely decorative icon (default aria-hidden). */
  'aria-label'?: string;
}

/**
 * Recolorable icon. Madli has no proprietary glyph set, so the system uses
 * Lucide (static SVGs from a CDN) applied as a CSS mask so `color` drives the
 * ink. The glyph is only inked once the mask has actually loaded — if the CDN
 * is unreachable the icon renders as empty space, never a filled block.
 */
export function Icon({ name, size = 20, color = 'currentColor', style, ...rest }: IconProps) {
  const url = `${BASE}${name}.svg`;
  const [ok, setOk] = useState(() => cache.get(url) === true);

  useEffect(() => {
    // Already resolved by the lazy useState initializer above — nothing to do.
    if (cache.has(url)) return;
    const img = new Image();
    img.onload = () => {
      cache.set(url, true);
      setOk(true);
    };
    img.onerror = () => {
      cache.set(url, false);
    };
    img.src = url;
  }, [url]);

  return (
    <span
      role="img"
      aria-hidden={!rest['aria-label']}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: '0 0 auto',
        background: ok ? color : 'transparent',
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        ...style,
      }}
      {...rest}
    />
  );
}
