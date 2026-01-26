import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { GridComponent } from "echarts/components";
import { LineChart } from "echarts/charts";
import { UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
    GridComponent,
    LineChart,
    CanvasRenderer,
    UniversalTransition,
]);

interface BasicLineChartProps {
    Xdata: string[];
    Ydata: number[];
}

const BasicLineChart: React.FC<BasicLineChartProps> = ({ Xdata, Ydata }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        // 初始化
        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);
        }

        const option = {
            xAxis: {
                type: "category",
                data: Xdata,
            },
            yAxis: {
                type: "value",
            },
            series: [
                {
                    data: Ydata,
                    type: "line",
                    smooth: true,
                    name: "28 Nov - 28 Dec, 2025"
                },
            ],
        };

        chartInstance.current.setOption(option);

        const resize = () => chartInstance.current?.resize();
        window.addEventListener("resize", resize);

        return () => {
            window.removeEventListener("resize", resize);
            chartInstance.current?.dispose();
            chartInstance.current = null;
        };
    }, [Xdata, Ydata]);

    return <div ref={chartRef} style={{ width: "100%", height: 400 }} />;
};

export default BasicLineChart;
