import { useFetcher } from "@remix-run/react";
import { useCallback, useEffect } from "react";

interface ReportData {
  [key: string]: any;
}

interface ReportOptions {
  action?: string; // 上报的 Remix action 路径
  method?: "post" | "get"; // 请求方法
  eventType?: "click" | "exposure"; // 事件类型
}

const useReport = () => {
  const fetcher = useFetcher();
  // useEffect(()=>{
  //   if (fetcher.data) {
  //     console.log(fetcher.data);
  //   }else{
  //     console.log('点击上报失败');
  //   }
  // },[fetcher.data])
  // 通用上报函数
  const report = async (
    data: ReportData,
    options: ReportOptions = {},
    name: string,
  ) => {
    const {
      action = "/app", // 默认 action 路径
      method = "post",
      eventType = "click",
    } = options;
    try {
      const reportData = {
        data,
        eventType,
        timestamp: new Date().toISOString(),
        name,
      };
      fetcher.submit(
        { googleAnalytics: JSON.stringify(reportData) },
        {
          method,
          action,
        },
      );
    } catch (error) {
      console.error(`Failed to report ${eventType}:`, error);
    }
  };

  // 曝光检测
  const trackExposure = useCallback(
    (
      target: Element,
      data: ReportData,
      options: ReportOptions = {},
      name: string,
    ) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              report({ ...data }, { ...options, eventType: "exposure" }, name);
              observer.unobserve(entry.target); // 仅上报一次
            }
          });
        },
        { threshold: 0.5 }, // 50% 可见时触发
      );

      observer.observe(target); // 必须调用这一句

      return () => observer.disconnect(); // 清理函数
    },
    [report],
  );
  const reportClick = (name:string)=>{
    report({},{ method: "post", action: "/app", eventType: "click" },name);
  }
  return { reportClick,report, trackExposure, fetcherState: fetcher.state };
};

export default useReport;
