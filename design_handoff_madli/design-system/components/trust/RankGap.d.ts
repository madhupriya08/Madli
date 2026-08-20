/** States the distance to the next pick — openly, including near-ties. */
export interface RankGapProps {
  /** clear = comfortable margin; close = near-tie, say so; thin = not enough data */
  tone?: "clear" | "close" | "thin";
  points?: number;
  comparedTo?: string;
  /** overrides the generated sentence */
  note?: string;
  showBar?: boolean;
  style?: React.CSSProperties;
}
export declare function RankGap(props: RankGapProps): JSX.Element;
