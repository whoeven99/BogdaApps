import { Text as PolarisText } from "@shopify/polaris";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AppSModal } from "~/ui/components/AppSModal";

const HAS_SHOWN_KEY = "ciwi-image-translation-freetrial-hasShow";

function shouldShowTrialStartedModal({
  isNew,
  isInFreePlanTime,
  hasShownLocal,
}: {
  isNew: boolean | null;
  isInFreePlanTime: boolean;
  hasShownLocal: boolean;
}) {
  return isNew === false && isInFreePlanTime === true && hasShownLocal !== true;
}

const HasPayForFreePlanModal: React.FC = () => {
  const { t } = useTranslation();
  const [content, setContent] = useState<{ show: boolean }>({ show: false });
  const { plan, isNew } = useSelector((state: any) => state.userConfig);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasShownLocal = Boolean(localStorage.getItem(HAS_SHOWN_KEY));
    const show = shouldShowTrialStartedModal({
      isNew,
      isInFreePlanTime: Boolean(plan?.isInFreePlanTime),
      hasShownLocal,
    });
    if (!show) return;
    localStorage.setItem(HAS_SHOWN_KEY, "1");
    setContent({ show: true });
  }, [isNew, plan?.isInFreePlanTime]);

  const close = () => setContent({ show: false });

  return (
    <AppSModal
      open={content.show}
      heading={t("Got a 5-day free trial")}
      onClose={close}
      primaryAction={{ content: t("Got it"), onAction: close }}
    >
      <PolarisText as="p" variant="bodyMd">
        {t("You have received {{ plan }} Plan benefits", {
          plan: plan?.type,
        })}
      </PolarisText>
      <ul style={{ paddingLeft: 20, margin: "12px 0 0" }}>
        <li>
          {t(
            "Get 40 extra translations instantly,plus {{count}} more after 5 days",
            { count: plan.id === 2 ? 100 : plan.id === 3 ? 300 : 800 },
          )}
        </li>
        <li>{t("Clearer images with advanced AI models")}</li>
        <li>{t("More accurate multilingual results")}</li>
        <li>{t("Batch translate to save time")}</li>
      </ul>
    </AppSModal>
  );
};

export default HasPayForFreePlanModal;
