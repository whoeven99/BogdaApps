import { Text as PolarisText } from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "@remix-run/react/dist/components";
import { useTranslation } from "react-i18next";
import useReport from "scripts/eventReport";
import { availableTranslationTimes } from "~/lib/merchantTimes";
import { AppSModal } from "~/ui/components/AppSModal";
import { InFlowSelect } from "~/ui/components/InFlowSelect";

export interface OptionType {
  key: string;
  name: string;
  Credits: number;
  price: {
    comparedPrice: number;
    currencyCode: string;
  };
}

export const AddCreaditsModal = ({
  openModal,
  onClose,
  action,
  productId,
  imageId,
}: {
  openModal: boolean;
  onClose: () => void;
  action: string;
  productId?: string;
  imageId?: string;
}) => {
  const { reportClick } = useReport();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const { t } = useTranslation();
  const [selectedOptionKey, setSelectedOption] = useState<string>("option-1");
  const catalogFetcher = useFetcher<{
    packs?: Array<{
      shopifyPlanName: string | null;
      credits: number;
      priceAmount: number;
    }>;
  }>();
  const creditOptions: OptionType[] = useMemo(() => {
    const packs = catalogFetcher.data?.packs ?? [];
    return packs.map((pack, index) => ({
      key: `option-${index + 1}`,
      name: String(pack.shopifyPlanName || "").replace(/\s+extra times$/i, ""),
      Credits: availableTranslationTimes(Number(pack.credits || 0)),
      price: {
        comparedPrice: Number(pack.priceAmount || 0),
        currencyCode: "USD",
      },
    }));
  }, [catalogFetcher.data]);
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  const selected = creditOptions.find((item) => item.key === selectedOptionKey);

  useEffect(() => {
    if (openModal && catalogFetcher.state === "idle" && !catalogFetcher.data) {
      catalogFetcher.load("/api/billing/catalog");
    }
  }, [openModal, catalogFetcher]);
  useEffect(() => {
    if (
      creditOptions.length > 0 &&
      !creditOptions.some((item) => item.key === selectedOptionKey)
    ) {
      setSelectedOption(creditOptions[0].key);
    }
  }, [creditOptions, selectedOptionKey]);

  const handlePay = () => {
    reportClick("pricing_buy_credits");
    setBuyButtonLoading(true);
    const selectedOption = creditOptions.find(
      (item) => item.key === selectedOptionKey,
    );
    const payInfo = {
      name: selectedOption?.name,
      price: {
        amount: selectedOption?.price.comparedPrice,
        currencyCode: selectedOption?.price.currencyCode,
      },
      action,
      productId,
      imageId,
    };
    const formData = new FormData();
    formData.append("payInfo", JSON.stringify(payInfo));
    payFetcher.submit(formData, {
      method: "POST",
      action: "/app",
    });
  };

  useEffect(() => {
    if (!payFetcher.data) return;
    if (payFetcher.data?.success) {
      const order =
        payFetcher.data?.response?.appPurchaseOneTimeCreate?.appPurchaseOneTime;
      const confirmationUrl =
        payFetcher.data?.response?.appPurchaseOneTimeCreate?.confirmationUrl;
      const orderInfo = {
        id: order?.id,
        amount: order?.price.amount,
        name: order?.name,
        createdAt: order?.createdAt,
        status: order?.status,
        confirmationUrl,
      };
      const formData = new FormData();
      formData.append("orderInfo", JSON.stringify(orderInfo));
      orderFetcher.submit(formData, {
        method: "post",
        action: "/app",
      });
      open(confirmationUrl, "_top");
    } else {
      setBuyButtonLoading(false);
    }
  }, [payFetcher.data]);

  return (
    <AppSModal
      open={openModal}
      heading={t("pricing.buyExtraTimes")}
      onClose={onClose}
      primaryAction={{
        content: t("pricing.buyNow"),
        onAction: handlePay,
        loading: buyButtonLoading,
        disabled: !selectedOptionKey || buyButtonLoading,
      }}
      secondaryActions={[
        { content: t("pricing.maybeLater"), onAction: onClose },
      ]}
    >
      <InFlowSelect
        label={t("pricing.creditPack")}
        labelHidden
        options={creditOptions.map((option) => ({
          value: option.key,
          label: `${option.Credits.toLocaleString()} ${t("extra times")} · $${option.price.comparedPrice.toFixed(2)}`,
        }))}
        value={selectedOptionKey}
        onChange={setSelectedOption}
        menuPreferAbove
      />
      <div className="pricing-pack-summary">
        <div>
          <PolarisText as="p" variant="bodySm" tone="subdued">
            {t("pricing.times")}
          </PolarisText>
          <PolarisText as="p" variant="headingMd" fontWeight="bold">
            {selected?.Credits.toLocaleString() ?? "0"} {t("extra times")}
          </PolarisText>
        </div>
        <div>
          <PolarisText as="p" variant="bodySm" tone="subdued">
            {t("pricing.totalPayment")}
          </PolarisText>
          <PolarisText as="p" variant="headingMd" fontWeight="bold">
            ${selected?.price.comparedPrice.toFixed(2) ?? "0.00"}
          </PolarisText>
        </div>
      </div>
    </AppSModal>
  );
};
