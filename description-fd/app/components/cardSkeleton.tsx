import styles from "./styles.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  active?: boolean;
}

const CardSkeleton = ({
  width = "100%",
  height = "40px",
  borderRadius = "10px",
  className,
  children,
  active = true,
}: SkeletonProps) => {
  return (
    <div
      className={styles.Skeleton_Loading}
      style={{
        width,
        height: active ? height : "auto",
        borderRadius,
        backgroundImage: active
          ? "linear-gradient(90deg, rgb(227,227,227) 25%, #ededed 37%, rgb(227,227,227) 63%)"
          : "none",
        backgroundColor: active ? "transparent" : "transparent",
        backgroundSize: "400% 100%",
        animation: `${styles.Skeleton_Loading} 1.4s ease infinite`,
      }}
    >
      {active ? null : children}
    </div>
  );
};

export default CardSkeleton;
