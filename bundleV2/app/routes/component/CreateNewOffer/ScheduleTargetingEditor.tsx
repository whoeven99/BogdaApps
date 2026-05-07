import { Checkbox, DatePicker, Select } from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import {
  normalizeCustomerProfileFilters,
  normalizeCustomerSegments,
  normalizeDraftIpCountryCodes,
  normalizeTargetMarkets,
} from "../../../utils/offerParsing";

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

const CUSTOMER_SEGMENT_OPTIONS = [
  { value: "all", label: "All customers" },
  { value: "new_customers", label: "New customers" },
  { value: "returning_customers", label: "Returning customers" },
  { value: "vip", label: "VIP customers" },
  { value: "high_aov", label: "High AOV customers" },
];

const CUSTOMER_PROFILE_FILTER_OPTIONS = [
  { value: "subscription_active", label: "Subscription active" },
  { value: "bundle_buyer", label: "Bundle buyer" },
  { value: "repeat_buyer", label: "Repeat buyer" },
  { value: "high_intent", label: "High intent" },
];

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
  customerSegments,
  setCustomerSegments,
  customerProfileFilters,
  setCustomerProfileFilters,
  ipCountryCodes,
  setIpCountryCodes,
  marketsError,
  ipCountryCodesError,
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
  const customerSummary = customerSegments.includes("all")
    ? "All customers"
    : `${customerSegments.length} segments`;

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
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 text-[14px] font-medium text-[#1c1f23]">
            Audience
          </h3>
          <div className="text-[12px] text-[#5c6166]">{customerSummary}</div>
        </div>
        <div className="rounded-[12px] border border-[#e3e8ed] bg-white px-4 py-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <label className="block text-[14px] font-medium text-[#1c1f23]">
              Customer Segments
              <Select
                mode="tags"
                size="large"
                className="mt-1 w-full"
                value={customerSegments}
                options={CUSTOMER_SEGMENT_OPTIONS}
                placeholder="Select or type segment handles"
                onChange={(values) => {
                  setCustomerSegments(
                    normalizeCustomerSegments(
                      values.map((value) => String(value || "").trim()),
                    ),
                  );
                }}
              />
              <p className="mt-1 text-[12px] font-normal text-[#5c6166]">
                Use Shopify customer segments or internal segment handles. Keep
                `all` selected to avoid segment restrictions.
              </p>
            </label>

            <label className="block text-[14px] font-medium text-[#1c1f23]">
              Customer Profile Filters
              <Select
                mode="tags"
                size="large"
                className="mt-1 w-full"
                value={customerProfileFilters}
                options={CUSTOMER_PROFILE_FILTER_OPTIONS}
                placeholder="VIP, subscription_active, repeat_buyer..."
                onChange={(values) =>
                  setCustomerProfileFilters(
                    normalizeCustomerProfileFilters(
                      values.map((value) => String(value || "").trim()),
                    ),
                  )
                }
              />
              <p className="mt-1 text-[12px] font-normal text-[#5c6166]">
                Optional profile traits you can evaluate in app logic later,
                such as VIP, subscription, or repeat-buyer cohorts.
              </p>
            </label>
          </div>

          <label className="mt-4 block text-[14px] font-medium text-[#1c1f23]">
            IP / Geo Country Filter
            <Select
              mode="tags"
              size="large"
              className="mt-1 w-full"
              status={ipCountryCodesError ? "error" : ""}
              value={ipCountryCodes}
              placeholder="US, CA, DE..."
              tokenSeparators={[",", " "]}
              onChange={(values) =>
                setIpCountryCodes(
                  normalizeDraftIpCountryCodes(
                    values.map((value) => String(value || "").trim()),
                  ),
                )
              }
            />
            {ipCountryCodesError ? (
              <p className="mt-1 text-[12px] font-normal text-[#d72c0d]">
                {ipCountryCodesError}
              </p>
            ) : (
              <p className="mt-1 text-[12px] font-normal text-[#5c6166]">
                Optional ISO country codes for IP-based targeting. This is stored
                now so storefront or app-side checks can use it later.
              </p>
            )}
          </label>
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
