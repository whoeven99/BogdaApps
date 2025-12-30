import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const Index = () => {
    const [timeRange, setTimeRange] = useState('Last 30d');
    const [filterOpen, setFilterOpen] = useState(false);

    // Daily revenue data
    const dailyRevenueData = [
        { date: 'Nov 29', value: 0 },
        { date: 'Dec 2', value: 0 },
        { date: 'Dec 5', value: 0 },
        { date: 'Dec 8', value: 0 },
        { date: 'Dec 11', value: 0 },
        { date: 'Dec 14', value: 0 },
        { date: 'Dec 17', value: 0 },
        { date: 'Dec 20', value: 0 },
        { date: 'Dec 23', value: 0 },
        { date: 'Dec 26', value: 0 },
    ];

    // Bundle conversion data for pie chart
    const conversionData = [
        { name: 'Converted', value: 0 },
        { name: 'Not Converted', value: 100 },
    ];

    const COLORS = ['#008060', '#e3e5e7'];

    return (
        <div className="max-w-[1280px] mx-auto px-[24px] pt-[24px]">
            {/* Header */}
            <div className="mb-[24px]">
                <h1 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.0703px] m-0">
                    Analytics
                </h1>
            </div>

            {/* Filters Bar */}
            <div className="flex items-center gap-[12px] mb-[24px]">
                <button
                    className="bg-white text-[#202223] px-[12px] py-[8px] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[21px] border border-[#c4cdd5] cursor-pointer hover:bg-[#f6f6f7] transition-colors flex items-center gap-[8px]"
                    onClick={() => setTimeRange(timeRange === 'Last 30d' ? 'Last 7d' : 'Last 30d')}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <path d="M2 6h12" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 2v2M11 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {timeRange}
                </button>

                <div style={{ position: 'relative' }}>
                    <button
                        className="bg-white text-[#202223] px-[12px] py-[8px] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[21px] border border-[#c4cdd5] cursor-pointer hover:bg-[#f6f6f7] transition-colors flex items-center gap-[8px]"
                        onClick={() => setFilterOpen(!filterOpen)}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        All bundle deals
                    </button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px] sm:gap-[16px] mb-[16px] sm:mb-[24px]">
                {/* Visitors */}
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                            Visitors
                        </span>
                        <HelpCircle size={16} className="text-[#6d7175]" />
                    </div>
                    <h3 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.3828px] m-0">
                        33
                    </h3>
                </div>

                {/* Bundle orders */}
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                            Bundle orders
                        </span>
                        <HelpCircle size={16} className="text-[#6d7175]" />
                    </div>
                    <h3 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.3828px] m-0">
                        0
                    </h3>
                </div>

                {/* Conversion to bundle */}
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                            Conversion to bundle
                        </span>
                        <HelpCircle size={16} className="text-[#6d7175]" />
                    </div>
                    <h3 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.3828px] m-0">
                        0%
                    </h3>
                </div>

                {/* Added revenue */}
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                            Added revenue
                        </span>
                        <HelpCircle size={16} className="text-[#6d7175]" />
                    </div>
                    <h3 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.3828px] m-0">
                        €0
                    </h3>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-[340px_1fr] gap-[16px]">
                {/* Bundle conversion - Pie Chart */}
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
                    <h3 className="font-['Inter'] font-semibold text-[16px] leading-[24px] text-[#202223] tracking-[-0.3203px] m-0 mb-[8px]">
                        Bundle conversion
                    </h3>
                    <p className="font-['Inter'] font-normal text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px] mb-[24px]">
                        See how many customers are converting to bundles.
                    </p>

                    <div style={{ width: '100%', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={conversionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={0}
                                    dataKey="value"
                                >
                                    {conversionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{
                            position: 'absolute',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <span style={{
                                fontSize: '32px',
                                fontWeight: 600,
                                color: '#202223',
                                fontFamily: 'Inter'
                            }}>
                                0
                            </span>
                        </div>
                    </div>
                </div>

                {/* Daily added revenue - Line Chart */}
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
                    <h3 className="font-['Inter'] font-semibold text-[16px] leading-[24px] text-[#202223] tracking-[-0.3203px] m-0 mb-[8px]">
                        Daily added revenue
                    </h3>
                    <p className="font-['Inter'] font-normal text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px] mb-[24px]">
                        See how much additional revenue you're making with this app every day.
                    </p>

                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={dailyRevenueData}>
                            <CartesianGrid strokeDasharray="0" stroke="#e3e5e7" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#6d7175' }}
                                axisLine={{ stroke: '#e3e5e7' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6d7175' }}
                                axisLine={{ stroke: '#e3e5e7' }}
                                tickLine={false}
                                domain={[0, 10]}
                                ticks={[0, 2.5, 5, 7.5, 10]}
                                tickFormatter={(value) => `€${value}.00`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #c4cdd5',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                }}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                                formatter={(value) => {
                                    if (value === 'current') return '28 Nov - 28 Dec, 2025';
                                    if (value === 'previous') return '30 Oct - 28 Nov, 2025';
                                    return value;
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#5c6ac4"
                                strokeWidth={2}
                                dot={false}
                                name="current"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Index;
