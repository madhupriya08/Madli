/** Filter chip. Selectable, optionally removable. */
export interface TagProps {
  children?: React.ReactNode;
  icon?: string;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  style?: React.CSSProperties;
}
export declare function Tag(props: TagProps): JSX.Element;
