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
    <div className="mb-6">
      <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
        Display Blocks
      </h3>
      <div className="flex flex-col gap-3">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-[#1c1f23]">
                Countdown
              </div>
            </div>
            <Switch
              checked={showCountdownBlock}
              onChange={setShowCountdownBlock}
            />
          </div>
          {showCountdownBlock && (
            <div className="mt-4">
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
