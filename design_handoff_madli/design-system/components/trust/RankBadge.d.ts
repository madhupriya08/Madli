/** The numeral 1, 2 or 3 in Cooper BT. Only ever those three ranks. */
export interface RankBadgeProps {
  rank?: 1 | 2 | 3;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline";
  style?: React.CSSProperties;
}
export declare function RankBadge(props: RankBadgeProps): JSX.Element;
