import { useCallback } from "react";
import CompactImageJobCard from "~/routes/component/contentImage/components/CompactImageJobCard";
import { useContentImageJob } from "~/routes/component/contentImage/useContentImageJob";
import { isCurrentImageJob } from "~/routes/component/contentImage/imageJobFilters";
import type { ContentImageJob } from "~/routes/component/contentImage/contentImageClient";
import { openCreditsPurchaseModal } from "~/utils/creditsPurchaseModal";

export default function HomeImageJobSection({
  initialJob,
}: {
  initialJob: ContentImageJob | null;
}) {
  const seed = isCurrentImageJob(initialJob) ? initialJob : null;
  const { job, replace } = useContentImageJob(seed);
  const handleBuyCredits = useCallback(() => {
    openCreditsPurchaseModal();
  }, []);
  if (!isCurrentImageJob(job) || !job) return null;
  return (
    <CompactImageJobCard job={job} onChanged={replace} onBuyCredits={handleBuyCredits} />
  );
}
