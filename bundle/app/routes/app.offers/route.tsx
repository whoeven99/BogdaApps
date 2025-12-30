import { useEffect, useState } from 'react';
import { ChartBar, Pencil, Copy, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from '@remix-run/react';


const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPublishGuide, setShowPublishGuide] = useState(false);

  console.log('OffersManagement render, showPublishGuide:', showPublishGuide);

  // Check if we came from create offer page
  useEffect(() => {
    const state = location.state as { showPublishGuide?: boolean } | null;
    console.log('Location state:', state);
    if (state && state.showPublishGuide) {
      // Small delay to ensure page has loaded
      setTimeout(() => {
        console.log('Setting showPublishGuide to true');
        setShowPublishGuide(true);
      }, 100);
      // Clear the state to prevent showing on refresh
      navigate('/offers', { replace: true, state: {} });
    }
  }, [location.state]);

  const offers = [
    { id: 1, name: 'Summer Bundle', status: 'Active', gmv: '$12,430', conversion: '3.2%', exposurePV: '45,230', addToCartPV: '8,920', created: '2024-01-15', updated: '2024-02-20' },
    { id: 2, name: 'Winter Sale Pack', status: 'Active', gmv: '$8,920', conversion: '2.8%', exposurePV: '38,150', addToCartPV: '7,200', created: '2024-01-20', updated: '2024-02-18' },
    { id: 3, name: 'Spring Collection', status: 'Paused', gmv: '$5,640', conversion: '1.9%', exposurePV: '22,600', addToCartPV: '4,100', created: '2024-02-01', updated: '2024-02-10' },
    { id: 4, name: 'Fall Essentials', status: 'Active', gmv: '$15,230', conversion: '4.1%', exposurePV: '52,100', addToCartPV: '10,500', created: '2024-01-10', updated: '2024-02-22' },
    { id: 5, name: 'Holiday Special', status: 'Draft', gmv: '$0', conversion: '0%', exposurePV: '0', addToCartPV: '0', created: '2024-02-22', updated: '2024-02-22' },
    { id: 6, name: 'Back to School', status: 'Active', gmv: '$9,850', conversion: '3.5%', exposurePV: '41,200', addToCartPV: '8,100', created: '2024-01-25', updated: '2024-02-15' },
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
            All Offers
          </h1>
          <p className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] mt-[4px]">
            Manage all your bundle offers
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-[8px] sm:gap-[12px] w-full sm:w-auto">
          <button
            className="bg-[#f4f6f8] text-[#202223] px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border border-[#c4cdd5] cursor-pointer hover:bg-[#e4e5e7] transition-colors"
            onClick={() => {
              console.log('Show Guide button clicked');
              setShowPublishGuide(true);
              console.log('After setState call');
            }}
          >
            Show Guide
          </button>
          <button
            className="bg-[#008060] text-white px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
            onClick={() => navigate('/app/create')}
          >
            Create New Offer
          </button>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Offer Name
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Status
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Exposure PV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Add to Cart PV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                GMV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Conversion
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Created
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {offers.map(offer => (
              <tr key={offer.id}>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {offer.name}
                    {offer.id <= 2 && (
                      <span style={{
                        backgroundColor: '#00A47C',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        NEW
                      </span>
                    )}
                  </div>
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
                        backgroundColor: offer.status === 'Active' ? '#008060' : '#c4cdd5',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        padding: 0
                      }}
                      title={offer.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: offer.status === 'Active' ? '22px' : '2px',
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
                      color: offer.status === 'Active' ? '#108043' : offer.status === 'Paused' ? '#916a00' : '#6d7175',
                      fontWeight: 500
                    }}>
                      {offer.status}
                    </span>
                  </div>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {offer.exposurePV}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {offer.addToCartPV}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {offer.gmv}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {offer.conversion}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                  {offer.created}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <button
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      onClick={() => navigate(`/ab-test/${offer.id}`)}
                      title="Analytics"
                    >
                      <ChartBar size={16} />
                    </button>
                    <button
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      onClick={() => navigate('/app/create')}
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      title="Copy"
                    >
                      <Copy size={16} />
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
  )
};

export default Index;
