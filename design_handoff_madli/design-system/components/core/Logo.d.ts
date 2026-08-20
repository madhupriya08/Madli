/** The Madli mark, from the supplied artwork. Never redrawn or recoloured. */
export interface LogoProps {
  variant?: "full" | "lockup" | "mark" | "wordmark" | "tagline";
  height?: number;
  /** path from the consuming page to this system's /assets folder */
  assetBase?: string;
  style?: React.CSSProperties;
}
export declare function Logo(props: LogoProps): JSX.Element;
