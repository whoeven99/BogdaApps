import { Button } from "@shopify/polaris";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import type { CSSProperties, ReactNode } from "react";

export interface AppPageBackAction {
  accessibilityLabel: string;
  onAction: () => void;
}

interface AppPageHeaderProps {
  title: ReactNode;
  titleMeta?: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  style?: CSSProperties;
  backAction?: AppPageBackAction;
  toolbarRow?: boolean;
  descriptionShowOnMobile?: boolean;
}

export default function AppPageHeader({
  title,
  titleMeta,
  description,
  extra,
  style,
  backAction,
}: AppPageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {backAction ? (
            <Button
              icon={ArrowLeftIcon}
              accessibilityLabel={backAction.accessibilityLabel}
              onClick={backAction.onAction}
            />
          ) : null}
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 650, lineHeight: "28px" }}>{title}</h1>
          {titleMeta}
        </div>
        {description ? (
          <p style={{ margin: "6px 0 0", color: "var(--p-color-text-secondary)" }}>{description}</p>
        ) : null}
      </div>
      {extra ? <div>{extra}</div> : null}
    </div>
  );
}
