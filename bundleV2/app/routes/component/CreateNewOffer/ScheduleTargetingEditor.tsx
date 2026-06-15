import { Checkbox, DatePicker, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { normalizeTargetMarkets } from "../../../utils/offerParsing";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Ant Design DatePicker expects local wall-clock dayjs, not tz()-shifted instances. */
function isoToSchedulePickerValue(iso: string, tz: string): Dayjs | null {
  if (!iso || !dayjs(iso).isValid()) return null;
  const wallClock = dayjs.utc(iso).tz(tz).format("YYYY-MM-DD HH:mm:ss");
  return dayjs(wallClock);
}

function schedulePickerValueToIso(date: Dayjs, tz: string): string {
  return dayjs.tz(date.format("YYYY-MM-DD HH:mm:ss"), tz).toISOString();
}

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
  customerSegments: string[];
  setCustomerSegments: React.Dispatch<React.SetStateAction<string[]>>;
  customerProfileFilters: string[];
  setCustomerProfileFilters: React.Dispatch<React.SetStateAction<string[]>>;
  ipCountryCodes: string[];
  setIpCountryCodes: React.Dispatch<React.SetStateAction<string[]>>;
  marketsError: string;
  ipCountryCodesError: string;
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
  marketsError,
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
  const visibilitySummary = markets.includes("all")
    ? "All markets"
    : `${markets.length} selected`;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 text-[14px] font-medium text-[#1c1f23]">
            Visibility
          </h3>
          <div className="text-[12px] text-[#5c6166]">{visibilitySummary}</div>
        </div>
        <div className="rounded-[12px] border border-[#e3e8ed] bg-white px-4 py-4">
          <label className="mb-3 block text-[14px] font-medium text-[#1c1f23]">
            Market Visibility
          </label>
          <div className="grid grid-cols-1 gap-3 rounded-[10px] bg-[#f6f8f9] p-4 md:grid-cols-2">
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
                      normalizeTargetMarkets(
                        prev.includes("all") ? [market.id] : [...prev, market.id],
                      ),
                    );
                  } else {
                    setMarkets((prev) =>
                      normalizeTargetMarkets(
                        prev.filter((value) => value !== market.id),
                      ),
                    );
                  }
                }}
              >
                {market.name}
              </Checkbox>
            ))}
          </div>
          {marketsError ? (
            <p className="mb-0 mt-2 text-[12px] text-[#d72c0d]">{marketsError}</p>
          ) : (
            <p className="mb-0 mt-2 text-[12px] text-[#5c6166]">
              Choose where the offer can appear.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="m-0 text-[14px] font-medium text-[#1c1f23]">
            Schedule
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#5c6166]">Timezone</span>
            <Select
              size="small"
              showSearch
              className="w-full md:w-[240px]"
              value={scheduleTimezone}
              onChange={setScheduleTimezone}
              options={tzOptions}
            />
          </div>
        </div>
        <div className="rounded-[12px] border border-[#e3e8ed] bg-white px-4 py-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="block text-[14px] font-medium text-[#1c1f23]">
              Start Time
              <DatePicker
                size="large"
                showTime={{ format: "HH:mm" }}
                format="YYYY-MM-DD HH:mm"
                className="mt-1 w-full text-[14px]"
                getPopupContainer={() => document.body}
                value={isoToSchedulePickerValue(startTime, scheduleTimezone)}
                onChange={(date) => {
                  const value = date
                    ? schedulePickerValueToIso(date, scheduleTimezone)
                    : "";
                  setStartTime(value);
                  if (value && endTime && !dayjs(endTime).isAfter(dayjs(value))) {
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
                <p className="mt-1 text-[12px] font-normal text-[#5c6166]">
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
                getPopupContainer={() => document.body}
                value={isoToSchedulePickerValue(endTime, scheduleTimezone)}
                onChange={(date) => {
                  const value = date
                    ? schedulePickerValueToIso(date, scheduleTimezone)
                    : "";
                  setEndTime(value);
                  if (!value) {
                    setEndTimeError("");
                    return;
                  }
                  if (startTime && !dayjs(value).isAfter(dayjs(startTime))) {
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
                <p className="mt-1 text-[12px] font-normal text-[#5c6166]">
                  Optional. Leave blank to keep the offer active long-term. Countdown blocks still require an end time.
                </p>
              )}
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
