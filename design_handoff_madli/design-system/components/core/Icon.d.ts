/** Recolorable Lucide glyph, applied as a CSS mask so `color` drives the ink. */
export interface IconProps {
  /** Lucide icon slug, e.g. "map-pin", "search", "chevron-down" */
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
