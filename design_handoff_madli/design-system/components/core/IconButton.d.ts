/** Square icon-only control, minimum 32px, 44px in touch contexts. */
export interface IconButtonProps {
  /** Lucide slug or a rendered node */
  icon: string | React.ReactNode;
  /** Required accessible label */
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "solid" | "onImage";
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
