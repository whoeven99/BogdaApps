type Props = {
  title: string;
  description?: string;
  meta?: string;
};

export default function BuilderStepIntro({
  title,
  description,
  meta,
}: Props) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      {meta ? (
        <div className="inline-flex w-fit items-center rounded-full border border-[#dfe3e8] bg-[#f6f6f7] px-3 py-1 text-[12px] font-medium text-[#5c6166]">
          {meta}
        </div>
      ) : null}
      <div>
        <h2 className="m-0 text-[20px] font-semibold text-[#1c1f23]">{title}</h2>
        {description ? (
          <p className="mt-1 mb-0 text-[13px] leading-[1.5] text-[#5c6166]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
