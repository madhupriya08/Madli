/**
 * The app's bottom navigation. Labels always visible.
 */
export interface TabBarProps {
  items?: Array<{ value: string; label: string; icon: string }>;
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}
export declare function TabBar(props: TabBarProps): JSX.Element;
