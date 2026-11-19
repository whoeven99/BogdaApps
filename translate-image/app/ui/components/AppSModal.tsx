import type { ReactNode } from "react";
import { Modal } from "@shopify/polaris";

export type AppSModalAction = {
  content: string;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: "auto" | "critical";
};

type Props = {
  open: boolean;
  heading: string;
  onClose: () => void;
  children: ReactNode;
  size?: string;
  className?: string;
  primaryAction?: AppSModalAction | null;
  secondaryActions?: AppSModalAction[];
  footerStart?: AppSModalAction | null;
};

/** Polaris Modal 适配 TSF AppSModal 签名；不引入 polaris-1.js / s-modal。 */
export function AppSModal({
  open,
  heading,
  onClose,
  children,
  primaryAction,
  secondaryActions,
  footerStart,
}: Props) {
  const secondaries = [
    ...(footerStart ? [footerStart] : []),
    ...(secondaryActions ?? []),
  ].map((action) => ({
    content: action.content,
    onAction: action.onAction,
    loading: action.loading,
    disabled: action.disabled,
    destructive: action.tone === "critical",
  }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={heading}
      primaryAction={
        primaryAction
          ? {
              content: primaryAction.content,
              onAction: primaryAction.onAction,
              loading: primaryAction.loading,
              disabled: primaryAction.disabled,
              destructive: primaryAction.tone === "critical",
            }
          : undefined
      }
      secondaryActions={secondaries.length ? secondaries : undefined}
    >
      <Modal.Section>{children}</Modal.Section>
    </Modal>
  );
}
