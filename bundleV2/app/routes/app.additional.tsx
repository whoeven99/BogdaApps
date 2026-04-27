export default function AdditionalPage() {
  return (
    <div className="mx-auto max-w-[960px] px-[16px] py-[20px] sm:px-[24px]">
      <div className="rounded-[12px] border border-[#dfe3e8] bg-white p-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-[24px]">
        <h1 className="m-0 text-[24px] font-semibold leading-[32px] tracking-[-0.02em] text-[#1c1f23] sm:text-[28px] sm:leading-[36px]">
          Resources
        </h1>
        <p className="mt-[8px] mb-0 max-w-[680px] text-[14px] leading-[21px] text-[#5c6166]">
          Use this page for operational references, internal enablement notes, or
          merchant support links that should remain visually consistent with the
          Shopify Admin experience.
        </p>

        <div className="mt-[20px] grid grid-cols-1 gap-[16px] md:grid-cols-2">
          <div className="rounded-[12px] border border-[#e9edf1] bg-[#fcfcfd] p-[16px]">
            <h2 className="m-0 text-[16px] font-semibold leading-[24px] text-[#1c1f23]">
              Merchant support
            </h2>
            <p className="mt-[6px] mb-0 text-[13px] leading-[20px] text-[#5c6166]">
              Add links to setup guides, rollout notes, and theme activation help.
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e9edf1] bg-[#fcfcfd] p-[16px]">
            <h2 className="m-0 text-[16px] font-semibold leading-[24px] text-[#1c1f23]">
              Team references
            </h2>
            <p className="mt-[6px] mb-0 text-[13px] leading-[20px] text-[#5c6166]">
              Keep operational documentation concise, practical, and focused on
              merchant tasks instead of template examples.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
