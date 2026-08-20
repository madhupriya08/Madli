/** Neutral white container: hairline border, low cool shadow, 14px radius. */
export interface CardProps {
  children?: React.ReactNode;
  padding?: string | number;
  interactive?: boolean;
  elevation?: "none" | "xs" | "sm" | "md" | "lg";
  radius?: string;
  as?: keyof JSX.IntrinsicElements;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
