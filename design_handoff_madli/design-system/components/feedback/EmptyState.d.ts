/** Says what is missing and what to do next. */
export interface EmptyStateProps {
  /** Lucide slug, default "map-pin-off" */
  icon?: string;
  title?: string;
  body?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
