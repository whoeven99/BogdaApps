type SummaryCard = {
  label: string;
  value: string;
  helper: string;
};

type Props = {
  cards: SummaryCard[];
};

export default function BuilderSummaryCards({ cards }: Props) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-[12px] border border-[#e3e8ed] bg-[#fafbfb] p-4"
        >
          <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#5c6166]">
            {card.label}
          </div>
          <div className="mt-1 text-[16px] font-semibold text-[#1c1f23]">
            {card.value}
          </div>
          <div className="mt-1 text-[13px] leading-[1.5] text-[#5c6166]">
            {card.helper}
          </div>
        </div>
      ))}
    </div>
  );
}
