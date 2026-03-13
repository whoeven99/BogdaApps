import { useState } from "react";

const WEEKDAY_MAP = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];

type ScheduleItem = {
  id: string;
  title: string;
  time: string;
  date: string;
};

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const initialSchedule: ScheduleItem[] = [
  { id: "1", title: "团队会议", time: "09:00", date: "2026-03-09" },
  { id: "2", title: "项目评审", time: "14:00", date: "2026-03-09" },
  { id: "3", title: "健身时间", time: "18:30", date: "2026-03-09" },
  { id: "4", title: "客户拜访", time: "10:00", date: "2026-03-12" },
  { id: "5", title: "代码审查", time: "15:00", date: "2026-03-15" },
];

export default function PersonalDashboard() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const weekday = WEEKDAY_MAP[today.getDay()];

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedule);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("09:00");

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const selectedDateKey = toDateKey(currentYear, currentMonth, selectedDay);
  const selectedSchedules = schedules
    .filter((s) => s.date === selectedDateKey)
    .sort((a, b) => a.time.localeCompare(b.time));

  const isToday = (d: number | null) => {
    if (!d) return false;
    return (
      d === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const hasSchedule = (d: number | null) => {
    if (!d) return false;
    const key = toDateKey(currentYear, currentMonth, d);
    return schedules.some((s) => s.date === key);
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(1);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(1);
  };

  const handleDayClick = (d: number | null) => {
    if (d) {
      setSelectedDay(d);
      setShowForm(false);
    }
  };

  const handleAddSchedule = () => {
    if (!newTitle.trim()) return;
    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      time: newTime,
      date: selectedDateKey,
    };
    setSchedules([...schedules, newItem]);
    setNewTitle("");
    setNewTime("09:00");
    setShowForm(false);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(schedules.filter((s) => s.id !== id));
  };

  const formatSelectedDate = () => {
    const m = currentMonth + 1;
    const d = selectedDay;
    const weekdayName = WEEK_DAYS[new Date(currentYear, currentMonth, selectedDay).getDay()];
    return `${m}月${d}日 周${weekdayName}`;
  };

  return (
    <s-stack direction="block" gap="base">
      <s-box
        padding="base"
        borderWidth="base"
        borderRadius="base"
        background="subdued"
      >
        <s-stack direction="block" gap="none">
          <s-heading>个人仪表盘</s-heading>
          <s-text tone="neutral">
            今天是 {year}年 {month}月 {day}日 {weekday}
          </s-text>
        </s-stack>
      </s-box>

      <s-stack direction="inline" gap="base">
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <s-heading>今日天气</s-heading>
          <s-stack direction="inline" gap="base">
            <div style={{ fontSize: "2.25rem", fontWeight: 600 }}>
              <s-text>22°C</s-text>
            </div>
            <s-stack direction="block" gap="none">
              <s-text>晴天 · 北京</s-text>
              <s-text tone="neutral">湿度 65% · 风速 12 km/h</s-text>
            </s-stack>
          </s-stack>
        </s-box>

        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <s-heading>日历与日程</s-heading>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={goToPrevMonth}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "0.25rem 0.5rem",
              }}
            >
              ‹
            </button>
            <s-text>
              {currentYear}年 {String(currentMonth + 1).padStart(2, "0")}月
            </s-text>
            <button
              type="button"
              onClick={goToNextMonth}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "0.25rem 0.5rem",
              }}
            >
              ›
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              marginBottom: "0.25rem",
            }}
          >
            {WEEK_DAYS.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  padding: "0.25rem 0",
                  fontSize: "0.75rem",
                  color: "var(--p-color-text-subdued, #6d7175)",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              rowGap: "0.25rem",
              marginBottom: "0.75rem",
            }}
          >
            {days.map((d, idx) => {
              const isSelected = d === selectedDay;
              const todayFlag = isToday(d);
              const has = hasSchedule(d);

              let background = "transparent";
              let color = "inherit";
              if (d) {
                if (isSelected && todayFlag) {
                  background = "#2c6ecb";
                  color = "#ffffff";
                } else if (isSelected) {
                  background = "#edf2ff";
                  color = "#1f4f90";
                } else if (todayFlag) {
                  background = "#2c6ecb";
                  color = "#ffffff";
                }
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(d)}
                  style={{
                    position: "relative",
                    textAlign: "center",
                    padding: "0.25rem 0",
                    borderRadius: "999px",
                    cursor: d ? "pointer" : "default",
                    background,
                    color,
                    fontSize: "0.875rem",
                  }}
                >
                  {d ?? ""}
                  {has && d && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 2,
                        left: "50%",
                        width: 4,
                        height: 4,
                        transform: "translateX(-50%)",
                        borderRadius: "999px",
                        backgroundColor: isSelected || todayFlag ? "#ffffff" : "#2c6ecb",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <s-text>{formatSelectedDate()}</s-text>
              <s-button
                variant="tertiary"
                onClick={() => setShowForm((prev) => !prev)}
              >
                {showForm ? "取消" : "添加日程"}
              </s-button>
            </div>

            {showForm && (
              <div style={{ marginBottom: "0.75rem" }}>
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="日程名称"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddSchedule();
                      }}
                      style={{
                        width: "100%",
                        padding: "0.375rem 0.5rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #c9cccf",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        style={{
                          padding: "0.375rem 0.5rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #c9cccf",
                        }}
                      />
                    </div>
                  </div>
                </s-box>
              </div>
            )}

            <s-stack direction="block" gap="base">
              {selectedSchedules.length === 0 && !showForm && (
                <s-text tone="info">暂无日程安排</s-text>
              )}
              {selectedSchedules.map((item) => (
                <s-box
                  key={item.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="transparent"
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <s-text>{item.title}</s-text>
                      <s-text tone="neutral">{item.time}</s-text>
                    </div>
                    <s-button
                      variant="tertiary"
                      onClick={() => handleDeleteSchedule(item.id)}
                    >
                      删除
                    </s-button>
                  </div>
                </s-box>
              ))}
            </s-stack>
          </div>
        </s-box>
      </s-stack>
    </s-stack>
  );
}

