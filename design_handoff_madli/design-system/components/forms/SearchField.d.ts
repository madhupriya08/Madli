/** Pill search input — the app's main entry point. */
export interface SearchFieldProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onSubmit?: (value?: string) => void;
  onClear?: () => void;
  size?: "md" | "lg";
  style?: React.CSSProperties;
}
export declare function SearchField(props: SearchFieldProps): JSX.Element;
