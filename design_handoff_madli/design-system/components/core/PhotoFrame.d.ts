/** Photography container with optional protection scrim; placeholder when src is absent. */
export interface PhotoFrameProps {
  src?: string;
  alt?: string;
  /** shown in the placeholder when no src is supplied */
  label?: string;
  ratio?: string;
  radius?: string;
  /** applies --scrim-bottom so white text stays legible */
  overlay?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function PhotoFrame(props: PhotoFrameProps): JSX.Element;
