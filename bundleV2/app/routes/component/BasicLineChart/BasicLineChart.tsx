import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { GridComponent, TooltipComponent } from "echarts/components";
import { LineChart } from "echarts/charts";
import { UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  GridComponent,
  TooltipComponent,
  LineChart,
  CanvasRenderer,
  UniversalTransition,
]);

interface BasicLineChartProps {
  Xdata: string[];
  Ydata: number[];
  height?: number;
  lineColor?: string;
  name?: string;
}

const BasicLineChart: React.FC<BasicLineChartProps> = ({ 
  Xdata, 
  Ydata, 
  height = 400,
  lineColor = "#008060",
  name = "GMV"
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: Xdata,
        axisLine: {
          lineStyle: {
            color: '#e1e3e5'
          }
        },
        axisLabel: {
          color: '#6d7175'
        }
      },
      yAxis: {
        type: "value",
        splitLine: {
          lineStyle: {
            color: '#f4f6f8'
          }
        },
        axisLabel: {
          color: '#6d7175'
        }
      },
      series: [
        {
          name: name,
          type: "line",
          smooth: true,
          data: Ydata,
          itemStyle: {
            color: lineColor
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${lineColor}33` },
              { offset: 1, color: `${lineColor}00` }
            ])
          }
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // We don't dispose here to prevent flickering on React fast refresh,
      // but if you do, make sure to handle it correctly.
    };
  }, [Xdata, Ydata, lineColor, name]);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
};

export default BasicLineChart;