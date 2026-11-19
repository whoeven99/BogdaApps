import { Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";
import Button from "~/ui/components/AppButton";
import { availableTranslationTimes } from "~/lib/merchantTimes";

const { Title } = Typography;

export default function AccountTranslationsCard({
  loading,
  remainingCredits,
  onBuyCredits,
}: {
  loading: boolean;
  remainingCredits: number;
  onBuyCredits: () => void;
}) {
  const { t } = useTranslation();
  const times = availableTranslationTimes(remainingCredits);
  return (
    <div className="pricing-usage-card">
      <Title level={4} style={{ margin: 0 }}>
        {t("pricing.availableTranslations")}
      </Title>
      <div className="pricing-usage-card__metric-main">
        {loading ? (
          <Skeleton active title={false} paragraph={{ rows: 1, width: ["40%"] }} />
        ) : (
          <div>
            <span className="pricing-usage-card__balance-value">
              {times.toLocaleString()}
            </span>
            <span className="pricing-usage-card__balance-suffix">
              {t("pricing.times")}
            </span>
          </div>
        )}
        <Button type="primary" onClick={onBuyCredits}>
          {t("pricing.buyCredits")}
        </Button>
      </div>
    </div>
  );
}
