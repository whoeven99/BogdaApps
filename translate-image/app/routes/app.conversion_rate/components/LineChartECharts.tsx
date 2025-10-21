import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface Props {
  data: any[];
  height?: number;
}

const LineChartECharts: React.FC<Props> = ({ data, height = 300 }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);

      // 使用 ResizeObserver 监听父容器尺寸变化
      const resizeObserver = new ResizeObserver(() => {
        chartInstance.current?.resize();
      });
      resizeObserver.observe(chartRef.current);

      return () => {
        resizeObserver.disconnect();
        chartInstance.current?.dispose();
      };
    }
  }, []);
  const formatPercent = (val: number) => {
    if (val == null) return "-";
    // 判断是不是整数
    return Number.isInteger(val) ? `${val}%` : `${val.toFixed(2)}%`;
  };
  useEffect(() => {
    if (!chartInstance.current) return;

    const option = {
      grid: {
        top: 20,
        right: 0,
        bottom: 0,
        left: 0,
        containLabel: true, // 如果你要完整显示坐标轴文字就留 true，不要的话可以设 false
      },
      xAxis: {
        type: "category",
        data: data[0].data.map((d: any) => d.key),
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%" },
        splitNumber: 2, // 控制纵轴分割线数量，数字越小越稀疏
        // 或者使用 interval 精确控制间隔
        // interval: 20,  // 每 20% 一个横线
      },
      series: data.map((series: any) => ({
        data: series.data.map((d: any) => d.value),
        type: "line",
        name: series.name,
        smooth: true,
        symbol: "none", // 去掉圆圈
      })),
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          let result = params[0].axisValue + "<br/>";
          params.forEach((item: any) => {
            result += `${item.marker}${item.seriesName}: ${formatPercent(item.value)}<br/>`;
          });
          return result;
        },
      },
    };

    chartInstance.current.setOption(option);
    chartInstance.current.resize();
  }, [data]);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
};

export default LineChartECharts;
