import type { ReactNode } from "react";
import { AlertCircle, X } from "lucide-react";

export const adminSurfaceCardClass =
  "rounded-[12px] border border-[#dfe3e8] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

export const adminPrimaryButtonClass =
  "inline-flex items-center justify-center rounded-[8px] border-0 bg-[#008060] px-[14px] py-[9px] text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#006e52] cursor-pointer";

export const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-[8px] border border-[#dfe3e8] bg-white px-[14px] py-[9px] text-[14px] font-medium text-[#1c1f23] transition-colors hover:bg-[#f6f6f7] cursor-pointer";

export const adminQuietActionClass =
  "inline-flex items-center gap-[6px] rounded-[8px] border-0 bg-transparent px-[12px] py-[6px] text-[14px] font-medium text-[#008060] transition-all hover:bg-[#f0f9f6] cursor-pointer";

type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function AdminPageHeader({
  title,
  subtitle,
  meta,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-[16px] flex flex-col gap-[12px] lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-[760px]">
        <h1 className="m-0 text-[24px] font-semibold leading-[32px] tracking-[-0.02em] text-[#1c1f23] sm:text-[28px] sm:leading-[36px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-[6px] mb-0 text-[14px] leading-[21px] text-[#5c6166]">
            {subtitle}
          </p>
        ) : null}
        {meta ? <div className="mt-[8px] flex flex-wrap gap-[8px]">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-[10px] sm:w-auto sm:flex-row sm:items-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

type ThemeExtensionBannerProps = {
  onActivate: () => void;
  onDismiss: () => void;
};

export function ThemeExtensionBanner({
  onActivate,
  onDismiss,
}: ThemeExtensionBannerProps) {
  return (
    <div className="mb-[24px] flex items-start justify-between rounded-[12px] border border-[#ffd5d2] bg-[#fff7f6] p-[16px] sm:p-[18px]">
      <div className="flex gap-[12px]">
        <div className="mt-[2px] text-[#d72c0d]">
          <AlertCircle size={20} />
        </div>
        <div>
          <div className="mb-[6px] inline-flex items-center rounded-full bg-[#ffe0db] px-[8px] py-[3px] text-[12px] font-medium text-[#b42318]">
            Action required
          </div>
          <h3 className="m-0 mb-[4px] text-[14px] font-semibold leading-[20px] text-[#1c1f23]">
            Activate Theme Extension
          </h3>
          <p className="m-0 text-[14px] leading-[20px] text-[#5c6166]">
            Offers stay hidden until the extension is enabled on an online or draft theme.
          </p>
          <div className="mt-[12px]">
            <button
              type="button"
              onClick={onActivate}
              className={adminSecondaryButtonClass}
            >
              Activate Theme Extension
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="bg-transparent border-0 cursor-pointer p-[4px] text-[#5c6166] hover:text-[#1c1f23]"
        aria-label="Dismiss theme extension notice"
      >
        <X size={20} />
      </button>
    </div>
  );
}

type AdminEmptyStateProps = {
  message: string;
};

export function AdminEmptyState({ message }: AdminEmptyStateProps) {
  return (
    <div className="rounded-[8px] border border-[#dfe3e8] bg-[#fcfcfd] p-[16px] text-[14px] leading-[21px] text-[#5c6166]">
      {message}
    </div>
  );
}

type AdminModalProps = {
  title: string;
  description: ReactNode;
  actions: ReactNode;
};

export function AdminModal({
  title,
  description,
  actions,
}: AdminModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)]">
      <div className="w-[90%] max-w-[400px] rounded-[16px] bg-white p-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        <h2 className="mb-[8px] text-[18px] font-semibold leading-[27px] text-[#1c1f23]">
          {title}
        </h2>
        <div className="mb-[16px] text-[14px] leading-[21px] text-[#5c6166]">
          {description}
        </div>
        <div className="flex justify-end gap-[8px]">{actions}</div>
      </div>
    </div>
  );
}
