/**
 * Quiet loading placeholder — a slow opacity breath, no travelling sheen.
 */
export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  circle?: boolean;
  style?: React.CSSProperties;
}
export declare function Skeleton(props: SkeletonProps): JSX.Element;

/** Skeleton in the exact geometry of a PickCard so nothing shifts on load. */
export interface PickSkeletonProps {
  layout?: "vertical" | "horizontal";
  style?: React.CSSProperties;
}
export declare function PickSkeleton(props: PickSkeletonProps): JSX.Element;
