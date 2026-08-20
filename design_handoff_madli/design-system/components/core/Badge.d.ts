/**
 * Small status or attribution pill.
 */
export interface BadgeProps {
  children?: React.ReactNode;
  tone?: "neutral" | "teal" | "sky" | "coral" | "success" | "warn" | "solid" | "onImage";
  /** default true — Madli badges are uppercase with open tracking */
  uppercase?: boolean;
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
