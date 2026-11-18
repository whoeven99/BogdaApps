import { TitleBar } from "@shopify/app-bridge-react";
import { useNavigate } from "@remix-run/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AppPageBackAction } from "./AppPageHeader";

type AppSubpageTitleBarProps = {
  title: string;
  parentUrl?: string;
  parentLabel?: string;
};

export function useAppHomeBackAction(
  parentUrl = "/app",
  parentLabel?: string,
): AppPageBackAction {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const label = parentLabel ?? t("Home");
  return useMemo(
    () => ({
      accessibilityLabel: label,
      onAction: () => navigate(parentUrl),
    }),
    [label, navigate, parentUrl],
  );
}

export default function AppSubpageTitleBar({ title }: AppSubpageTitleBarProps) {
  return <TitleBar title={title} />;
}
