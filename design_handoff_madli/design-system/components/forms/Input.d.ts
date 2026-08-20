/**
 * Single-line text field.
 */
export interface InputProps {
  label?: string;
  hint?: string;
  error?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  /** Lucide slug rendered inside the field */
  iconLeft?: string;
  suffix?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
