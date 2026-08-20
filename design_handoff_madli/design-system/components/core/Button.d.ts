/**
 * Primary action control.
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** primary = Deep Teal; accent = Coral, reserved for one CTA per view */
  variant?: "primary" | "accent" | "secondary" | "ghost" | "quiet" | "inverse";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
