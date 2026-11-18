import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { Button } from "@shopify/polaris";

export type AppButtonProps = {
  type?: "primary" | "default" | "dashed" | "text" | "link";
  size?: "large" | "middle" | "small";
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  icon?: ReactNode;
  htmlType?: "button" | "submit" | "reset";
  block?: boolean;
  id?: string;
};

function polarisVariant(type: AppButtonProps["type"]): "primary" | "secondary" | "plain" | "primary" {
  if (type === "primary") return "primary";
  if (type === "text" || type === "link") return "plain";
  return "secondary";
}

function polarisSize(size: AppButtonProps["size"]): "slim" | "medium" | "large" {
  if (size === "small") return "slim";
  if (size === "large") return "large";
  return "medium";
}

export default function AppButton({
  type = "default",
  size = "middle",
  loading,
  disabled,
  danger,
  onClick,
  children,
  className,
  style,
  icon,
  htmlType = "button",
  block,
  id,
}: AppButtonProps) {
  return (
    <span className={className} style={{ display: block ? "block" : undefined, ...style }} id={id}>
      <Button
        variant={polarisVariant(type)}
        size={polarisSize(size)}
        loading={loading}
        disabled={disabled}
        tone={danger ? "critical" : undefined}
        onClick={onClick as () => void}
        submit={htmlType === "submit"}
        icon={icon as never}
        fullWidth={block}
      >
        {children as string}
      </Button>
    </span>
  );
}
