/** 列表首帧占位条，与 translate-v4 的 v4-skeleton 动画一致。 */
export function ListSkeletonLine({
  width,
  height = 12,
  radius = 6,
}: {
  width: number | string;
  height?: number;
  radius?: number;
}) {
  return (
    <span
      aria-hidden
      className="v4-skeleton"
      style={{
        display: "block",
        width,
        maxWidth: "100%",
        height,
        borderRadius: radius,
      }}
    />
  );
}

export function ListSkeletonThumb() {
  return <div className="image-list-skeleton-thumb" aria-hidden />;
}
