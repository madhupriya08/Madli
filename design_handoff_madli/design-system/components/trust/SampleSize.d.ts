/** The evidence footnote under a pick: real counts and the time window. */
export interface SampleSizeProps {
  locals?: number;
  visitors?: number;
  /** time window label, default "last 90 days" */
  window?: string;
  extra?: string;
  style?: React.CSSProperties;
}
export declare function SampleSize(props: SampleSizeProps): JSX.Element;
