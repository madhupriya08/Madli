/** The one-sentence reason attached to a pick. */
export interface ReasonNoteProps {
  children?: React.ReactNode;
  /** default "Why this one"; use "Why this is a gem" with tone="gem" */
  label?: string;
  tone?: "plain" | "gem";
  style?: React.CSSProperties;
}
export declare function ReasonNote(props: ReasonNoteProps): JSX.Element;
