import { Input, Switch } from "antd";

type Props = {
  showCountdownBlock: boolean;
  setShowCountdownBlock: (checked: boolean) => void;
  countdownLabel: string;
  setCountdownLabel: (value: string) => void;
};

export default function DisplayBlocksEditor({
  showCountdownBlock,
  setShowCountdownBlock,
  countdownLabel,
  setCountdownLabel,
}: Props) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-[14px] font-medium text-[#1c1f23]">
          Display Blocks
        </h3>
        <div className="text-[12px] text-[#5c6166]">1 available</div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-[12px] border border-[#e3e8ed] bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-medium text-[#1c1f23]">
                Countdown
              </div>
              <div className="text-[12px] text-[#5c6166]">
                Add a lightweight urgency message above the offer.
              </div>
            </div>
            <Switch
              checked={showCountdownBlock}
              onChange={setShowCountdownBlock}
            />
          </div>
          {showCountdownBlock && (
            <div className="mt-4 border-t border-[#eef1f3] pt-4">
              <label className="block text-[14px] font-medium text-[#1c1f23]">
                Countdown Label
                <Input
                  size="large"
                  value={countdownLabel}
                  placeholder="e.g. Offer ends soon"
                  className="mt-1"
                  onChange={(e) =>
                    setCountdownLabel(e.target.value.replace(/[\r\n]+/g, " "))
                  }
                  maxLength={40}
                  showCount
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
