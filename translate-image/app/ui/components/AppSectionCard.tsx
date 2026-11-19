import type { CSSProperties, ReactNode } from "react";
import { Card } from "@shopify/polaris";

interface AppSectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  bodyPadding?: string;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
  fill?: boolean;
  showDescriptionOnMobile?: boolean;
}

export default function AppSectionCard({
  title,
  description,
  extra,
  children,
  className,
  style,
}: AppSectionCardProps) {
  return (
    <div className={className} style={style}>
      <Card>
        {(title || extra || description) && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              {title ? <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h2> : null}
              {description ? (
                <p style={{ margin: "4px 0 0", color: "var(--p-color-text-secondary)" }}>
                  {description}
                </p>
              ) : null}
            </div>
            {extra}
          </div>
        )}
        {children}
      </Card>
    </div>
  );
}
