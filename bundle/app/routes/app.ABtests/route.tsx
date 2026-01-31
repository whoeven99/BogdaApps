import { useNavigate } from "@remix-run/react";
import { ArrowDown, ArrowUp, ChartBar, Pencil, Trash2 } from "lucide-react";

const Index = () => {
    const navigate = useNavigate();

    const abTests = [
        { id: 1, name: 'Summer Bundle Test', status: 'Running', variant: 'A vs B', pv: '45,230', conversion: '3.2%', extraGMV: '$1,240', roi: '340%', created: '2024-01-15', duration: '14 days', improvement: 15.3 },
        { id: 2, name: 'Winter Promotion Test', status: 'Paused', variant: 'A vs B vs C', pv: '38,150', conversion: '2.9%', extraGMV: '$890', roi: '285%', created: '2024-01-20', duration: '21 days', improvement: -8.2 },
        { id: 3, name: 'Spring Collection Test', status: 'Running', variant: 'A vs B', pv: '52,100', conversion: '4.1%', extraGMV: '$1,850', roi: '425%', created: '2024-02-01', duration: '7 days', improvement: 22.7 },
        { id: 4, name: 'Fall Essentials Test', status: 'Completed', variant: 'A vs B vs C', pv: '61,200', conversion: '3.8%', extraGMV: '$2,100', roi: '380%', created: '2024-01-10', duration: '28 days', improvement: 18.5 },
        { id: 5, name: 'Holiday Special Test', status: 'Draft', variant: 'A vs B', pv: '0', conversion: '0%', extraGMV: '$0', roi: '0%', created: '2024-02-22', duration: '0 days', improvement: 0 },
        { id: 6, name: 'Back to School Test', status: 'Running', variant: 'A vs B', pv: '41,200', conversion: '3.5%', extraGMV: '$1,450', roi: '360%', created: '2024-01-25', duration: '10 days', improvement: -3.6 },
    ];

    return (
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
            {/* Back Button */}
            <button
                className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[8px] py-[4px] rounded-[6px] mb-[12px] flex items-center gap-[4px]"
                onClick={() => navigate('/app')}
            >
                ← Back to Dashboard
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px] sm:mb-[24px]">
                <div>
                    <h1 className="font-['Inter'] font-semibold text-[20px] sm:text-[24px] leading-[30px] sm:leading-[36px] text-[#202223] tracking-[0.0703px] m-0">
                        A/B Tests
                    </h1>
                    <p className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] mt-[4px]">
                        Manage and monitor all your A/B tests
                    </p>
                </div>
                <button
                    className="w-full sm:w-auto bg-[#008060] text-white px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
                    onClick={() => navigate('/ABtest/1')}
                >
                    Create A/B Test
                </button>
            </div>

            {/* AB Tests Table */}
            <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                Test Name
                            </th>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                Status
                            </th>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                Variants
                            </th>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                PV
                            </th>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                Conversion Rate
                            </th>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                Extra GMV
                            </th>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                ROI
                            </th>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                GMV Improvement
                            </th>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                Duration
                            </th>
                            <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {abTests.map(test => (
                            <tr key={test.id}>
                                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                                    {test.name}
                                </td>
                                <td className="p-[12px] border-b border-[#dfe3e8]">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Toggle status logic here
                                            }}
                                            style={{
                                                position: 'relative',
                                                width: '44px',
                                                height: '24px',
                                                backgroundColor: test.status === 'Running' ? '#008060' : '#c4cdd5',
                                                border: 'none',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s',
                                                padding: 0
                                            }}
                                            title={test.status === 'Running' ? 'Click to stop' : 'Click to start'}
                                        >
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    top: '2px',
                                                    left: test.status === 'Running' ? '22px' : '2px',
                                                    width: '20px',
                                                    height: '20px',
                                                    backgroundColor: 'white',
                                                    borderRadius: '50%',
                                                    transition: 'left 0.2s',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                }}
                                            />
                                        </button>
                                        <span style={{
                                            fontSize: '14px',
                                            color: test.status === 'Running' ? '#108043' : test.status === 'Paused' ? '#916a00' : test.status === 'Completed' ? '#5c6ac4' : '#6d7175',
                                            fontWeight: 500
                                        }}>
                                            {test.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                                    {test.variant}
                                </td>
                                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                                    {test.pv}
                                </td>
                                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                                    {test.conversion}
                                </td>
                                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                                    {test.extraGMV}
                                </td>
                                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                                    {test.roi}
                                </td>
                                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[14px] leading-[22.4px] tracking-[-0.1504px]">
                                    <span style={{
                                        color: test.improvement >= 0 ? '#108043' : '#d72c0d',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {test.improvement >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                        {Math.abs(test.improvement)}%
                                    </span>
                                </td>
                                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                                    {test.duration}
                                </td>
                                <td className="p-[12px] border-b border-[#dfe3e8]">
                                    <div className="flex items-center gap-[8px]">
                                        <button
                                            className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                                            onClick={() => navigate(`/ABtest/${test.id}`)}
                                            title="View Details"
                                        >
                                            <ChartBar size={16} />
                                        </button>
                                        <button
                                            className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                                            onClick={() => navigate(`/ABtest/${test.id}`)}
                                            title="Edit"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[4px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Index;
