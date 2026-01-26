import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent, GraphicComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([PieChart, TooltipComponent, GraphicComponent, CanvasRenderer]);

interface Props {
    value: number; // 当前值
    total?: number; // 最大值（默认100）
}

const DonutChart: React.FC<Props> = ({ value, total = 100 }) => {
    const ref = useRef<HTMLDivElement>(null);
    const chart = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        if (!chart.current) {
            chart.current = echarts.init(ref.current);
        }

        const option = {
            series: [
                {
                    type: "pie",
                    radius: ["70%", "85%"],
                    startAngle: 90,
                    roundCap: true,
                    silent: true,
                    label: { show: false },
                    data: [
                        {
                            value,
                            itemStyle: {
                                color: "rgb(0, 128, 96)",
                            },
                        },
                        {
                            value: total - value,
                            itemStyle: {
                                color: "#e5e5e5",
                            },
                        },
                    ],
                },
            ],
            graphic: {
                type: "text",
                left: "center",
                top: "center",
                style: {
                    text: value.toString(),
                    fontSize: 36,
                    fontWeight: 600,
                    fill: "rgb(0, 128, 96)",
                },
            },
        };


        chart.current.setOption(option);

        return () => {
            chart.current?.dispose();
            chart.current = null;
        };
    }, [value, total]);

    return <div ref={ref} style={{ width: 200, height: 200 }} />;
};

export default DonutChart;
