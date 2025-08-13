export { default as SmartImage } from "./SmartImage";
export { default as SmartAvatar } from "./SmartAvatar";
export { Button } from "./Button";
export { Card } from "./Card";
export { ProductCard } from "./ProductCard";
export { SkeletonLoader, Skeleton } from "./SkeletonLoader";
export { default as ARProductViewer } from "./ARProductViewer";

// Lazy-loaded components for performance optimization
export {
  withLazyLoading,
  LazyARProductViewer,
  LazyChatScreen,
  Lazy3DModelViewer,
  LazyAnalyticsDashboard,
  LazySettingsScreen,
  usePreloadComponent,
  useConditionalLazyLoad,
} from "./LazyComponent";
