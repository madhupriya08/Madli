/**
 * One of Madli's three picks, with its reason, gap and sample size attached.
 */
export interface PickCardProps {
  rank?: 1 | 2 | 3;
  name?: string;
  category?: string;
  neighborhood?: string;
  priceLevel?: string;
  /** required in practice — a pick without a reason is not a pick */
  reason?: string;
  reasonLabel?: string;
  gem?: boolean;
  gapTone?: "clear" | "close" | "thin";
  gapPoints?: number;
  gapNote?: string;
  locals?: number;
  visitors?: number;
  dataWindow?: string;
  photoSrc?: string;
  photoLabel?: string;
  layout?: "vertical" | "horizontal";
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function PickCard(props: PickCardProps): JSX.Element;
