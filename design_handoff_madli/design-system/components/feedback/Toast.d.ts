/** Dark single-line confirmation, sits above the tab bar. */
export interface ToastProps {
  children?: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "error";
  action?: () => void;
  actionLabel?: string;
  onDismiss?: () => void;
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
