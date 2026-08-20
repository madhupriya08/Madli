/** Centred modal on desktop, bottom sheet on the phone. */
export interface DialogProps {
  open?: boolean;
  variant?: "modal" | "sheet";
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  width?: number;
  style?: React.CSSProperties;
}
export declare function Dialog(props: DialogProps): JSX.Element;
