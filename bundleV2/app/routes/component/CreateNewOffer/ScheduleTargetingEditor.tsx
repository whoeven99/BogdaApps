import { Checkbox, DatePicker, Select } from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(timezone);

type MarketItem = {
  id: string;
  name: string;
  handle: string;
};

type TimezoneOption = {
  value: string;
  label: string;
};

type Props = {
  markets: string[];
  setMarkets: React.Dispatch<React.SetStateAction<string[]>>;
  shopMarkets: MarketItem[];
  scheduleTimezone: string;
  setScheduleTimezone: (value: string) => void;
  tzOptions: TimezoneOption[];
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  startTimeError: string;
  setStartTimeError: (value: string) => void;
  endTimeError: string;
  setEndTimeError: (value: string) => void;
};

export default function ScheduleTargetingEditor({
  markets,
  setMarkets,
  shopMarkets,
  scheduleTimezone,
  setScheduleTimezone,
  tzOptions,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  startTimeError,
  setStartTimeError,
  endTimeError,
  setEndTimeError,
}: Props) {
  return (
    <>
      <div className="mb-8">
        <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
          Visibility
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[14px] font-medium text-[#1c1f23] mb-2">
              Market Visibility
            </label>
            <div className="grid grid-cols-2 gap-3 border border-gray-200 rounded-md p-4">
              <Checkbox
                checked={markets.includes("all")}
                onChange={(e) => {
                  if (e.target.checked) setMarkets(["all"]);
                }}
              >
                All Markets
              </Checkbox>
              {shopMarkets.map((market) => (
                <Checkbox
                  key={market.id}
                  checked={markets.includes(market.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMarkets((prev) =>
                        prev.includes("all") ? [market.id] : [...prev, market.id],
                      );
                    } else {
                      setMarkets((prev) => prev.filter((value) => value !== market.id));
                    }
                  }}
                >
                  {market.name}
                </Checkbox>
              ))}
            </div>
            <p className="text-[13px] text-[#5c6166] mt-2">
              Select which markets can see this offer
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-medium text-[#1c1f23] flex items-center">
            Schedule
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#5c6166]">Timezone:</span>
            <Select
              size="small"
              showSearch
              className="w-[240px]"
              value={scheduleTimezone}
              onChange={setScheduleTimezone}
              options={tzOptions}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            Start Time
            <DatePicker
              size="large"
              showTime={{ format: "HH:mm" }}
              format="YYYY-MM-DD HH:mm"
              className="mt-1 w-full text-[14px]"
              value={
                startTime && dayjs(startTime).isValid()
                  ? dayjs(startTime).tz(scheduleTimezone)
                  : null
              }
              onChange={(date) => {
                const value = date
                  ? dayjs
                      .tz(date.format("YYYY-MM-DD HH:mm:ss"), scheduleTimezone)
                      .toISOString()
                  : "";
                setStartTime(value);
                if (value && endTime && dayjs(endTime).isBefore(dayjs(value))) {
                  setStartTimeError("Start time must be before end time.");
                } else {
                  setStartTimeError("");
                  setEndTimeError("");
                }
              }}
              status={startTimeError ? "error" : ""}
            />
            <input type="hidden" name="startTime" value={startTime} />
            {startTimeError ? (
              <p className="text-red-500 text-xs mt-1">{startTimeError}</p>
            ) : (
              <p className="text-[13px] text-[#5c6166] mt-1 font-normal">
                When the offer becomes active
              </p>
            )}
          </label>
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            End Time
            <DatePicker
              size="large"
              showTime={{ format: "HH:mm" }}
              format="YYYY-MM-DD HH:mm"
              className="mt-1 w-full"
              value={
                endTime && dayjs(endTime).isValid()
                  ? dayjs(endTime).tz(scheduleTimezone)
                  : null
              }
              onChange={(date) => {
                const value = date
                  ? dayjs
                      .tz(date.format("YYYY-MM-DD HH:mm:ss"), scheduleTimezone)
                      .toISOString()
                  : "";
                setEndTime(value);
                if (value && startTime && dayjs(value).isBefore(dayjs(startTime))) {
                  setEndTimeError("End time must be after start time.");
                } else {
                  setEndTimeError("");
                  setStartTimeError("");
                }
              }}
              status={endTimeError ? "error" : ""}
            />
            <input type="hidden" name="endTime" value={endTime} />
            {endTimeError ? (
              <p className="text-red-500 text-xs mt-1">{endTimeError}</p>
            ) : (
              <p className="text-[13px] text-[#5c6166] mt-1 font-normal">
                When the offer expires
              </p>
            )}
          </label>
        </div>
      </div>
    </>
  );
}
