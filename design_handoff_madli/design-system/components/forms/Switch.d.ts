/** Settings toggle, 44x26, label on the left. */
export interface SwitchProps {
  label?: string;
  description?: string;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Switch(props: SwitchProps): JSX.Element;
