import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Copy, Trash2, Pencil, ChartBar, ChevronDown, ChevronUp, ArrowUp, ArrowDown, X, HelpCircle } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/polaris-custom.css';

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="bg-white flex flex-col sm:flex-row gap-[8px] sm:gap-[16px] items-stretch sm:items-start pb-0 px-[16px] pt-[16px] rounded-[8px] mb-[16px] sm:mb-[24px]">
      <Link 
        to="/" 
        className={`rounded-[4px] px-[12px] py-[7px] no-underline text-center sm:text-left ${
          location.pathname === '/' ? 'bg-[#f4f6f8]' : ''
        }`}
      >
        <span className="font-['Inter'] font-normal leading-[25.6px] text-[#202223] text-[16px] tracking-[-0.3125px]">
          Dashboard
        </span>
      </Link>
      <Link 
        to="/offers" 
        className={`rounded-[4px] px-[12px] py-[7px] no-underline text-center sm:text-left ${
          location.pathname === '/offers' ? 'bg-[#f4f6f8]' : ''
        }`}
      >
        <span className="font-['Inter'] font-normal leading-[25.6px] text-[#202223] text-[#202223] text-[16px] tracking-[-0.3125px]">
          All Offers
        </span>
      </Link>
      <Link 
        to="/pricing" 
        className={`rounded-[4px] px-[12px] py-[7px] no-underline text-center sm:text-left ${
          location.pathname === '/pricing' ? 'bg-[#f4f6f8]' : ''
        }`}
      >
        <span className="font-['Inter'] font-normal leading-[25.6px] text-[#202223] text-[16px] tracking-[-0.3125px]">
          Pricing
        </span>
      </Link>
    </nav>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [isThemeExtensionEnabled, setIsThemeExtensionEnabled] = useState(true);
  
  const offers = [
    { id: 1, name: 'Summer Bundle', status: 'Active', gmv: '$12,430', conversion: '3.2%', exposurePV: '45,230', addToCartPV: '8,920' },
    { id: 2, name: 'Winter Sale Pack', status: 'Active', gmv: '$8,920', conversion: '2.8%', exposurePV: '38,150', addToCartPV: '7,200' },
    { id: 3, name: 'Spring Collection', status: 'Paused', gmv: '$5,640', conversion: '1.9%', exposurePV: '22,600', addToCartPV: '4,100' },
  ];
  
  const abTests = [
    { id: 1, name: 'Summer Bundle Test', status: 'Running', variant: 'A vs B', pv: '45,230', extraGMV: '$1,240', improvement: 15.3, daysRunning: 14, confidence: 95 },
    { id: 2, name: 'Winter Promotion Test', status: 'Paused', variant: 'A vs B vs C', pv: '38,150', extraGMV: '$890', improvement: -8.2, daysRunning: 21, confidence: 78 },
  ];
  
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
      {/* Header */}
      <div className="mb-[16px] sm:mb-[24px]">
        <h1 className="font-['Inter'] font-semibold text-[20px] sm:text-[24px] leading-[30px] sm:leading-[36px] text-[#202223] tracking-[0.0703px] m-0">
          Dashboard
        </h1>
      </div>
      
      {/* GMV Overview and Theme Extension - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[16px] sm:gap-[24px] mb-[24px] sm:mb-[36px]">
        {/* GMV Overview Card */}
        <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="font-['Inter'] font-semibold text-[20px] leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
              GMV Overview
            </h2>
            <button 
              className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px]"
              onClick={() => navigate('/analytics')}
            >
              View Details
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] sm:gap-[20px]">
            {/* Total GMV */}
            <div className="flex flex-col gap-[12px] sm:gap-[16px]">
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                Total GMV
              </span>
              <h3 className="font-['Inter'] font-semibold text-[28px] leading-[42px] text-[#202223] tracking-[0.3828px] m-0">
                $125,430
              </h3>
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-[-0.1504px]">
                ↑ +15.2% from last month
              </span>
            </div>
            
            {/* Active Offers */}
            <div className="flex flex-col gap-[16px]">
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                Active Offers
              </span>
              <h3 className="font-['Inter'] font-semibold text-[28px] leading-[42px] text-[#202223] tracking-[0.3828px] m-0">
                24
              </h3>
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-[-0.1504px]">
                ↑ +3 new this week
              </span>
            </div>
            
            {/* Avg. Conversion */}
            <div className="flex flex-col gap-[16px]">
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                Avg. Conversion
              </span>
              <h3 className="font-['Inter'] font-semibold text-[28px] leading-[42px] text-[#202223] tracking-[0.3828px] m-0">
                2.8%
              </h3>
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#916a00] tracking-[-0.1504px]">
                → No change
              </span>
            </div>
          </div>
        </div>
        
        {/* Theme Extension Widget */}
        <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
          {/* Header with Active Status */}
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="font-['Inter'] font-semibold text-[20px] leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
              Theme extension
            </h2>
            <div className={`flex items-center gap-[6px] px-[8px] py-[4px] rounded-[4px] ${isThemeExtensionEnabled ? 'bg-[#d1f7c4]' : 'bg-[#f4f6f8]'}`}>
              <div className={`w-[8px] h-[8px] rounded-full ${isThemeExtensionEnabled ? 'bg-[#108043]' : 'bg-[#6d7175]'}`}></div>
              <span className={`font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] ${isThemeExtensionEnabled ? 'text-[#108043]' : 'text-[#6d7175]'}`}>
                {isThemeExtensionEnabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          {/* Description */}
          <p className="font-['Inter'] font-normal text-[16px] leading-[25.6px] text-[#202223] tracking-[-0.3125px] mb-[20px]">
            {isThemeExtensionEnabled 
              ? 'Bundles widget is visible in product pages.' 
              : 'Bundles widget is currently disabled.'}
          </p>
          
          {/* Enable/Disable and Need help buttons */}
          <div className="flex flex-col gap-[12px]">
            <button 
              onClick={() => setIsThemeExtensionEnabled(!isThemeExtensionEnabled)}
              className={`px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] cursor-pointer transition-colors w-full border-0 ${
                isThemeExtensionEnabled 
                  ? 'bg-white border border-[#dfe3e8] text-[#d72c0d] hover:bg-[#fef3f2]' 
                  : 'bg-[#008060] text-white hover:bg-[#006e52]'
              }`}
            >
              {isThemeExtensionEnabled ? 'Disable' : 'Enable'}
            </button>
            <button className="bg-white border border-[#dfe3e8] px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] text-[#202223] tracking-[-0.1504px] cursor-pointer hover:bg-[#f4f6f8] transition-colors w-full">
              Need help?
            </button>
          </div>
        </div>
      </div>
      
      {/* My Offers Card - Full Width */}
      <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px] sm:p-[20px] mb-[24px] sm:mb-[36px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px]">
          <h2 className="font-['Inter'] font-semibold text-[18px] sm:text-[20px] leading-[27px] sm:leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
            My Offers
          </h2>
          <button 
            className="w-full sm:w-auto bg-[#008060] text-white px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
            onClick={() => navigate('/create')}
          >
            Create New Offer
          </button>
        </div>
        
        {/* Desktop Table */}
        <table className="hidden md:table w-full border-collapse">
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
                      color: offer.status === 'Active' ? '#108043' : '#6d7175',
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
        
        {/* Mobile Cards */}
        <div className="md:hidden space-y-[12px]">
          {offers.map(offer => (
            <div key={offer.id} className="border border-[#dfe3e8] rounded-[8px] p-[16px]">
              <div className="flex items-start justify-between mb-[12px]">
                <div className="flex items-center gap-[8px] flex-wrap">
                  <span className="font-['Inter'] font-medium text-[16px] text-[#202223]">
                    {offer.name}
                  </span>
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
                </div>
              </div>
              
              <div className="flex items-center gap-[8px] mb-[12px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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
                  color: offer.status === 'Active' ? '#108043' : '#6d7175',
                  fontWeight: 500
                }}>
                  {offer.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-[12px] mb-[12px]">
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">GMV</div>
                  <div className="text-[14px] font-medium text-[#202223]">{offer.gmv}</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">Conversion</div>
                  <div className="text-[14px] font-medium text-[#202223]">{offer.conversion}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-[8px] pt-[12px] border-t border-[#dfe3e8]">
                <button 
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  onClick={() => navigate(`/ab-test/${offer.id}`)}
                  title="Analytics"
                >
                  <ChartBar size={18} />
                </button>
                <button 
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  title="Copy"
                >
                  <Copy size={18} />
                </button>
                <button 
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[8px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* View All Button at Bottom */}
        <div className="flex justify-center mt-[16px] sm:mt-[20px] pt-[16px] border-t border-[#dfe3e8]">
          <button 
            className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[16px] py-[8px] rounded-[6px]"
            onClick={() => navigate('/offers')}
          >
            View All Offers
          </button>
        </div>
      </div>
      
      {/* A/B Tests Card - Full Width */}
      <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px] sm:p-[20px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px]">
          <h2 className="font-['Inter'] font-semibold text-[18px] sm:text-[20px] leading-[27px] sm:leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
            A/B Tests
          </h2>
          <button 
            className="w-full sm:w-auto bg-[#008060] text-white px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
            onClick={() => navigate('/ab-test/1')}
          >
            Create A/B Test
          </button>
        </div>
        
        {/* Desktop Table */}
        <table className="hidden md:table w-full border-collapse">
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
                Extra GMV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                GMV Improvement
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Days Running
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Confidence
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
                      color: test.status === 'Running' ? '#108043' : '#6d7175',
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
                  {test.extraGMV}
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
                  {test.daysRunning} days
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  <span style={{ 
                    color: test.confidence >= 95 ? '#108043' : test.confidence >= 80 ? '#6d7175' : '#d72c0d',
                    fontWeight: test.confidence >= 95 ? 600 : 400
                  }}>
                    {test.confidence}%
                  </span>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <button 
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      onClick={() => navigate(`/ab-test/${test.id}`)}
                      title="View Details"
                    >
                      <ChartBar size={16} />
                    </button>
                    <button 
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
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
        
        {/* Mobile Cards */}
        <div className="md:hidden space-y-[12px]">
          {abTests.map(test => (
            <div key={test.id} className="border border-[#dfe3e8] rounded-[8px] p-[16px]">
              <div className="mb-[12px]">
                <span className="font-['Inter'] font-medium text-[16px] text-[#202223]">
                  {test.name}
                </span>
              </div>
              
              <div className="flex items-center gap-[8px] mb-[12px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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
                  color: test.status === 'Running' ? '#108043' : '#6d7175',
                  fontWeight: 500
                }}>
                  {test.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-[12px] mb-[12px]">
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">PV</div>
                  <div className="text-[14px] font-medium text-[#202223]">{test.pv}</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">Extra GMV</div>
                  <div className="text-[14px] font-medium text-[#202223]">{test.extraGMV}</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">GMV Improvement</div>
                  <div className={`text-[14px] font-medium ${test.improvement > 0 ? 'text-[#108043]' : 'text-[#d72c0d]'}`}>
                    {test.improvement > 0 ? '↑' : '↓'} {Math.abs(test.improvement)}%
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">Confidence</div>
                  <div className="text-[14px] font-medium text-[#202223]">{test.confidence}%</div>
                </div>
              </div>
              
              <div className="flex items-center gap-[8px] pt-[12px] border-t border-[#dfe3e8]">
                <button 
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  onClick={() => navigate(`/ab-test/${test.id}`)}
                  title="View Details"
                >
                  <ChartBar size={18} />
                </button>
                <button 
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[8px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* View All Button at Bottom */}
        <div className="flex justify-center mt-[16px] sm:mt-[20px] pt-[16px] border-t border-[#dfe3e8]">
          <button 
            className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[16px] py-[8px] rounded-[6px]"
            onClick={() => navigate('/ab-tests')}
          >
            View All A/B Tests
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateOffer() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [offerType, setOfferType] = useState('quantity-breaks-same');
  const [productSelection, setProductSelection] = useState('specific-selected');
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [discountRules, setDiscountRules] = useState([
    { 
      id: 1, 
      isExpanded: true,
      title: 'Buy 1, get 1 free',
      buyQty: 1,
      getQty: 1,
      priceType: 'default',
      subtitle: '',
      badgeText: '',
      badgeStyle: 'simple',
      label: 'SAVE {{saved_percentage}}',
      selectedByDefault: true,
      showAsSoldOut: false
    }
  ]);
  
  const steps = [
    'Basic Information',
    'Products & Discounts',
    'Style Design',
    'Schedule & Budget'
  ];
  
  const offerTypes = [
    { 
      id: 'quantity-breaks-same', 
      name: 'Quantity breaks for the same product',
      description: 'Offer discounts when customers buy multiple quantities of the same product'
    },
    { 
      id: 'bogo', 
      name: 'Buy X, get Y free (BOGO) deal',
      description: 'Create buy-one-get-one or buy-X-get-Y-free promotions'
    },
    { 
      id: 'quantity-breaks-different', 
      name: 'Quantity breaks for different products',
      description: 'Offer discounts when customers buy multiple different products together'
    },
    { 
      id: 'complete-bundle', 
      name: 'Complete the bundle',
      description: 'Encourage customers to complete a bundle by adding recommended products'
    },
    { 
      id: 'subscription', 
      name: 'Subscription',
      description: 'Offer recurring subscription discounts for regular deliveries'
    },
    { 
      id: 'progressive-gifts', 
      name: 'Progressive gifts',
      description: 'Unlock free gifts as customers add more items to their cart'
    }
  ];
  
  return (
    <div className="polaris-page">
      <div className="polaris-page__header">
        <div>
          <button className="polaris-button polaris-button--plain" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h1 className="polaris-page__title">Create New Offer</h1>
        </div>
      </div>
      
      <div className="polaris-card" style={{ marginBottom: '80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '24px' }} className="sm:flex sm:gap-[12px]">
          {steps.map((stepName, index) => (
            <div 
              key={index}
              style={{
                flex: 1,
                padding: '10px 8px',
                background: step === index + 1 ? '#008060' : '#f4f6f8',
                color: step === index + 1 ? 'white' : '#6d7175',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              className="sm:text-[14px] sm:p-[12px]"
              onClick={() => setStep(index + 1)}
            >
              <span className="hidden sm:inline">{index + 1}. </span>{stepName}
            </div>
          ))}
        </div>
        
        <div className="polaris-layout">
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }} className="lg:grid-cols-[1fr_400px]">
              {/* Left Column - Form */}
              <div>
                <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Basic Information</h2>
                <div className="polaris-stack polaris-stack--vertical">
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Offer Name
                    <input 
                      type="text" 
                      placeholder="e.g., Summer Bundle Deal"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </label>
                  
                  <label style={{ fontSize: '14px', fontWeight: 500, marginTop: '16px' }}>
                    Offer Type
                    <select 
                      value={offerType}
                      onChange={(e) => setOfferType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      {offerTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              
              {/* Right Column - Preview */}
              <div style={{ position: 'sticky', top: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Preview</h3>
                <p className="polaris-text-subdued" style={{ fontSize: '13px', marginBottom: '12px' }}>
                  {offerTypes.find(type => type.id === offerType)?.description}
                </p>
                
                {/* Preview Card */}
                <div style={{ 
                  width: '100%',
                  minHeight: '300px',
                  border: '1px solid #dfe3e8', 
                  borderRadius: '8px', 
                  padding: '16px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                    {offerType === 'quantity-breaks-same' && (
                      <>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#f9fafb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: '14px' }}>Single</strong>
                              <div style={{ fontSize: '12px', color: '#6d7175' }}>Standard price</div>
                            </div>
                            <strong style={{ fontSize: '16px' }}>€65,00</strong>
                          </div>
                        </div>
                        <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '12px', position: 'relative', background: '#ffffff' }}>
                          <div style={{ position: 'absolute', top: '-8px', right: '12px', background: '#000', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600 }}>
                            Most Popular
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '14px' }}>Duo</strong>
                                <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE €19,50</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#6d7175' }}>You save 15%</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '16px' }}>€110,50</strong>
                              <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€130,00</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 'auto', padding: '12px 0' }}>
                          <strong style={{ fontSize: '13px' }}>Quantity breaks for the same product</strong>
                        </div>
                      </>
                    )}
                    
                    {offerType === 'bogo' && (
                      <>
                        <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '13px' }}>Buy 1, get 1 free</strong>
                              <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 50%</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '14px' }}>€65,00</strong>
                            <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€130,00</div>
                          </div>
                        </div>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '13px' }}>Buy 2, get 3 free</strong>
                              <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 60%</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '14px' }}>€130,00</strong>
                            <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€325,00</div>
                          </div>
                        </div>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '13px' }}>Buy 3, get 6 free</strong>
                              <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 67%</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '14px' }}>€195,00</strong>
                            <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€585,00</div>
                          </div>
                        </div>
                        <div style={{ background: '#e0e0e0', padding: '8px 12px', borderRadius: '6px', textAlign: 'center', fontSize: '12px', marginBottom: '12px' }}>
                          + FREE special gift!
                        </div>
                        <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '13px' }}>Buy X, get Y free (BOGO) deal</strong>
                        </div>
                      </>
                    )}
                    
                    {offerType === 'quantity-breaks-different' && (
                      <>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#f9fafb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: '14px' }}>1 pack</strong>
                              <div style={{ fontSize: '12px', color: '#6d7175' }}>Standard price</div>
                            </div>
                            <strong style={{ fontSize: '16px' }}>€65,00</strong>
                          </div>
                        </div>
                        <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '12px', position: 'relative', marginBottom: '8px', background: '#ffffff' }}>
                          <div style={{ position: 'absolute', top: '-8px', right: '12px', background: '#000', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600 }}>
                            MOST POPULAR
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '14px' }}>2 pack</strong>
                                <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 15%</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#6d7175' }}>You save €10,05</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '16px' }}>€56,95</strong>
                              <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€67,00</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: '#2b2b2b', borderTop: '1px solid #e0e0e0', paddingTop: '8px' }}>
                            FetchLink C10 GPS Wireless Dog Fence with 2K Camera - ciwi
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button style={{ marginTop: '8px', background: '#000', color: '#fff', padding: '4px 12px', borderRadius: '4px', border: 'none', fontSize: '11px', cursor: 'pointer' }}>
                              Choose
                            </button>
                          </div>
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                          <strong style={{ fontSize: '13px' }}>Quantity breaks for different products</strong>
                        </div>
                      </>
                    )}
                    
                    {offerType === 'complete-bundle' && (
                      <>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: '13px' }}>FetchLink C10 GPS</strong>
                              <div style={{ fontSize: '11px', color: '#6d7175' }}>Standard price</div>
                            </div>
                            <strong style={{ fontSize: '14px' }}>€65,00</strong>
                          </div>
                        </div>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', marginBottom: '10px', opacity: 0.6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <input type="radio" readOnly disabled style={{ width: '16px', height: '16px' }} />
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: '13px', color: '#6d7175' }}>Complete the bundle</strong>
                              <div style={{ fontSize: '11px', color: '#6d7175' }}>Save €14,50!</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '14px', color: '#6d7175' }}>€60,00</strong>
                              <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€74,50</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                              <div style={{ fontSize: '10px', color: '#6d7175', marginBottom: '4px' }}>FetchLink</div>
                              <div style={{ fontSize: '11px' }}>€52,00</div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                              <div style={{ fontSize: '10px', color: '#6d7175', marginBottom: '4px' }}>Bosch</div>
                              <div style={{ fontSize: '11px' }}>€8,00</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '13px' }}>Complete the bundle</strong>
                        </div>
                      </>
                    )}
                    
                    {offerType === 'subscription' && (
                      <>
                        <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '13px' }}>Buy 1, get 1 free</strong>
                              <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 50%</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '14px' }}>€65,00</strong>
                            <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€130,00</div>
                          </div>
                        </div>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '13px' }}>Buy 2, get 3 free</strong>
                              <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 60%</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '14px' }}>€130,00</strong>
                            <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€325,00</div>
                          </div>
                        </div>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '13px' }}>Buy 3, get 6 free</strong>
                              <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 67%</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '14px' }}>€195,00</strong>
                            <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€585,00</div>
                          </div>
                        </div>
                        <div style={{ background: '#e0e0e0', padding: '8px 12px', borderRadius: '6px', textAlign: 'center', fontSize: '12px', marginBottom: '8px' }}>
                          + FREE special gift!
                        </div>
                        <div style={{ border: '1px dashed #000', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" readOnly style={{ width: '16px', height: '16px' }} />
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '12px' }}>Subscribe & Save 20%</strong>
                            <div style={{ fontSize: '10px', color: '#6d7175' }}>Delivered weekly</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 'auto', marginBottom: '6px' }}>
                          <strong style={{ fontSize: '13px' }}>Subscription</strong>
                        </div>
                      </>
                    )}
                    
                    {offerType === 'progressive-gifts' && (
                      <>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#f9fafb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: '14px' }}>1 pack</strong>
                            </div>
                            <strong style={{ fontSize: '16px' }}>€65,00</strong>
                          </div>
                        </div>
                        <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#ffffff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '14px' }}>2 pack</strong>
                                <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 15%</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '16px' }}>€110,50</strong>
                              <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€130,00</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '14px' }}>3 pack</strong>
                                <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 15%</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '16px' }}>€165,75</strong>
                              <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€195,00</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ background: '#fff8e6', border: '1px solid #ffd700', borderRadius: '8px', padding: '8px', marginBottom: '6px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>🎁 Unlock Free gifts</div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: '6px', padding: '6px', textAlign: 'center', background: '#fff' }}>
                              <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>FREE</div>
                              <div style={{ fontSize: '16px' }}>🚚</div>
                              <div style={{ fontSize: '9px', color: '#6d7175' }}>Free shipping</div>
                            </div>
                            <div style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: '6px', padding: '6px', textAlign: 'center', background: '#f5f5f5', opacity: 0.5 }}>
                              <div style={{ fontSize: '16px' }}>🔒</div>
                              <div style={{ fontSize: '9px', color: '#6d7175' }}>Locked</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 'auto', marginBottom: '6px' }}>
                          <strong style={{ fontSize: '13px' }}>Progressive gifts</strong>
                        </div>
                      </>
                    )}
                  </div>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <>
              {/* Product Modal */}
              {showProductModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    background: '#fff',
                    borderRadius: '12px',
                    width: '90%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '24px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Select Products</h2>
                      <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} />
                      </button>
                    </div>
                    
                    <input 
                      type="text" 
                      placeholder="Search products..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '14px'
                      }}
                    />
                    
                    {/* Mock product list */}
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                      {[
                        { id: 1, name: 'Product A', price: '€65.00', image: 'https://via.placeholder.com/60' },
                        { id: 2, name: 'Product B', price: '€75.00', image: 'https://via.placeholder.com/60' },
                        { id: 3, name: 'Product C', price: '€85.00', image: 'https://via.placeholder.com/60' }
                      ].map(product => (
                        <div key={product.id} style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '12px',
                          border: '1px solid #dfe3e8',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          if (!selectedProducts.find(p => p.id === product.id)) {
                            setSelectedProducts([...selectedProducts, product]);
                          }
                        }}
                        >
                          <img src={product.image} alt={product.name} style={{ width: '60px', height: '60px', borderRadius: '6px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{product.name}</div>
                            <div style={{ color: '#6d7175', fontSize: '14px' }}>{product.price}</div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={selectedProducts.some(p => p.id === product.id)}
                            readOnly
                            style={{ width: '20px', height: '20px' }}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={() => setShowProductModal(false)}
                      style={{
                        width: '100%',
                        background: '#2b2b2b',
                        color: '#fff',
                        padding: '12px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
                {/* Left Column - Form */}
                <div>
                  <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Products & Discounts</h2>
                  
                  {/* Product Selection Section */}
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Products eligible for offer</h3>
                    
                    {selectedProducts.length === 0 ? (
                      <button 
                        onClick={() => setShowProductModal(true)}
                        style={{
                          width: '100%',
                          background: '#ffffff',
                          color: '#202223',
                          padding: '14px 20px',
                          fontSize: '14px',
                          fontWeight: 500,
                          border: '1px solid #dfe3e8',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        Add products eligible for offer
                      </button>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                          {selectedProducts.slice(0, 3).map(product => (
                            <div key={product.id} style={{
                              border: '1px solid #dfe3e8',
                              borderRadius: '8px',
                              padding: '8px',
                              textAlign: 'center',
                              flex: 1
                            }}>
                              <img src={product.image} alt={product.name} style={{ width: '60px', height: '60px', borderRadius: '6px', marginBottom: '8px' }} />
                              <div style={{ fontSize: '12px', fontWeight: 500 }}>{product.name}</div>
                              <div style={{ fontSize: '11px', color: '#6d7175' }}>{product.price}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6d7175', marginBottom: '12px' }}>
                          {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
                        </div>
                        <button 
                          onClick={() => setShowProductModal(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#008060',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            padding: 0
                          }}
                        >
                          Edit products
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Discount Rules Section */}
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Discount rules</h3>
                    
                    {discountRules.map((rule, index) => (
                      <div key={rule.id} style={{
                        border: '1px solid #dfe3e8',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        overflow: 'hidden'
                      }}>
                        {/* Rule Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '16px',
                          background: rule.isExpanded ? '#f9fafb' : '#fff',
                          borderBottom: rule.isExpanded ? '1px solid #dfe3e8' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const newRules = [...discountRules];
                          newRules[index].isExpanded = !newRules[index].isExpanded;
                          setDiscountRules(newRules);
                        }}
                        >
                          <span style={{ fontSize: '16px' }}>🎯</span>
                          <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
                            Bar #{index + 1} - {rule.title}
                          </span>
                          
                          <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              disabled={index === 0}
                              onClick={() => {
                                if (index > 0) {
                                  const newRules = [...discountRules];
                                  [newRules[index], newRules[index - 1]] = [newRules[index - 1], newRules[index]];
                                  setDiscountRules(newRules);
                                }
                              }}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                opacity: index === 0 ? 0.3 : 1,
                                padding: '4px'
                              }}
                            >
                              <ArrowUp size={18} />
                            </button>
                            <button 
                              disabled={index === discountRules.length - 1}
                              onClick={() => {
                                if (index < discountRules.length - 1) {
                                  const newRules = [...discountRules];
                                  [newRules[index], newRules[index + 1]] = [newRules[index + 1], newRules[index]];
                                  setDiscountRules(newRules);
                                }
                              }}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: index === discountRules.length - 1 ? 'not-allowed' : 'pointer',
                                opacity: index === discountRules.length - 1 ? 0.3 : 1,
                                padding: '4px'
                              }}
                            >
                              <ArrowDown size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setDiscountRules([...discountRules, { ...rule, id: Date.now(), isExpanded: false }]);
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                              <Copy size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setDiscountRules(discountRules.filter((_, i) => i !== index));
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#d72c0d' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          
                          {rule.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                        
                        {/* Rule Content */}
                        {rule.isExpanded && (
                          <div style={{ padding: '16px' }}>
                            {/* Buy/Get quantities */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                              <div>
                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                                  Quantity
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Buy</span>
                                  <input 
                                    type="number"
                                    value={rule.buyQty}
                                    onChange={(e) => {
                                      const newRules = [...discountRules];
                                      newRules[index].buyQty = parseInt(e.target.value) || 0;
                                      setDiscountRules(newRules);
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      border: '1px solid #dfe3e8',
                                      borderRadius: '6px',
                                      fontSize: '14px'
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                                  Quantity
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 500 }}>, get</span>
                                  <input 
                                    type="number"
                                    value={rule.getQty}
                                    onChange={(e) => {
                                      const newRules = [...discountRules];
                                      newRules[index].getQty = parseInt(e.target.value) || 0;
                                      setDiscountRules(newRules);
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      border: '1px solid #dfe3e8',
                                      borderRadius: '6px',
                                      fontSize: '14px'
                                    }}
                                  />
                                  <span style={{ fontSize: '14px', fontWeight: 500 }}>free!</span>
                                </div>
                              </div>
                              
                              <div>
                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px', color: '#a0a0a0' }}>
                                  Price
                                </label>
                                <select 
                                  value={rule.priceType}
                                  onChange={(e) => {
                                    const newRules = [...discountRules];
                                    newRules[index].priceType = e.target.value;
                                    setDiscountRules(newRules);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    color: '#a0a0a0'
                                  }}
                                >
                                  <option value="default">Default</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </div>
                            </div>
                            
                            {/* Title and Subtitle */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                              <div>
                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                  Title
                                  <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
                                </label>
                                <input 
                                  type="text"
                                  value={rule.title}
                                  onChange={(e) => {
                                    const newRules = [...discountRules];
                                    newRules[index].title = e.target.value;
                                    setDiscountRules(newRules);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                />
                              </div>
                              
                              <div>
                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                  Subtitle
                                  <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
                                </label>
                                <input 
                                  type="text"
                                  value={rule.subtitle}
                                  onChange={(e) => {
                                    const newRules = [...discountRules];
                                    newRules[index].subtitle = e.target.value;
                                    setDiscountRules(newRules);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                />
                              </div>
                            </div>
                            
                            {/* Badge text and style */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                              <div>
                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                  Badge text
                                  <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
                                </label>
                                <input 
                                  type="text"
                                  value={rule.badgeText}
                                  onChange={(e) => {
                                    const newRules = [...discountRules];
                                    newRules[index].badgeText = e.target.value;
                                    setDiscountRules(newRules);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                />
                              </div>
                              
                              <div>
                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                  Badge style
                                  <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
                                </label>
                                <select 
                                  value={rule.badgeStyle}
                                  onChange={(e) => {
                                    const newRules = [...discountRules];
                                    newRules[index].badgeStyle = e.target.value;
                                    setDiscountRules(newRules);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                >
                                  <option value="simple">Simple</option>
                                  <option value="bold">Bold</option>
                                  <option value="outline">Outline</option>
                                </select>
                              </div>
                            </div>
                            
                            {/* Label */}
                            <div style={{ marginBottom: '16px' }}>
                              <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                Label
                                <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
                              </label>
                              <input 
                                type="text"
                                value={rule.label}
                                onChange={(e) => {
                                  const newRules = [...discountRules];
                                  newRules[index].label = e.target.value;
                                  setDiscountRules(newRules);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: '1px solid #dfe3e8',
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                            
                            {/* Selected by default */}
                            <div style={{ marginBottom: '16px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox"
                                  checked={rule.selectedByDefault}
                                  onChange={(e) => {
                                    const newRules = [...discountRules];
                                    newRules[index].selectedByDefault = e.target.checked;
                                    setDiscountRules(newRules);
                                  }}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '14px' }}>Selected by default</span>
                              </label>
                            </div>
                            
                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                              <button style={{
                                flex: 1,
                                padding: '10px',
                                border: '1px solid #dfe3e8',
                                borderRadius: '6px',
                                background: '#fff',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}>
                                🖼️ Add image
                              </button>
                              <button style={{
                                flex: 1,
                                padding: '10px',
                                border: '1px solid #dfe3e8',
                                borderRadius: '6px',
                                background: '#fff',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}>
                                📈 Add upsell
                              </button>
                              <button style={{
                                flex: 1,
                                padding: '10px',
                                border: '1px solid #dfe3e8',
                                borderRadius: '6px',
                                background: '#fff',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}>
                                🎁 Add free gift
                              </button>
                            </div>
                            
                            {/* Show as Sold out toggle */}
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              paddingTop: '16px',
                              borderTop: '1px solid #dfe3e8'
                            }}>
                              <span style={{ fontSize: '14px' }}>Show as Sold out</span>
                              <label style={{ 
                                position: 'relative', 
                                display: 'inline-block', 
                                width: '48px', 
                                height: '24px',
                                cursor: 'pointer'
                              }}>
                                <input 
                                  type="checkbox"
                                  checked={rule.showAsSoldOut}
                                  onChange={(e) => {
                                    const newRules = [...discountRules];
                                    newRules[index].showAsSoldOut = e.target.checked;
                                    setDiscountRules(newRules);
                                  }}
                                  style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                  position: 'absolute',
                                  cursor: 'pointer',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: rule.showAsSoldOut ? '#008060' : '#dfe3e8',
                                  borderRadius: '24px',
                                  transition: '0.3s'
                                }}>
                                  <span style={{
                                    position: 'absolute',
                                    content: '',
                                    height: '18px',
                                    width: '18px',
                                    left: rule.showAsSoldOut ? '26px' : '3px',
                                    bottom: '3px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    transition: '0.3s'
                                  }} />
                                </span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Add new rule button */}
                    <button 
                      onClick={() => {
                        setDiscountRules([...discountRules, {
                          id: Date.now(),
                          isExpanded: true,
                          title: `Buy ${discountRules.length + 1}, get ${discountRules.length + 1} free`,
                          buyQty: discountRules.length + 1,
                          getQty: discountRules.length + 1,
                          priceType: 'default',
                          subtitle: '',
                          badgeText: '',
                          badgeStyle: 'simple',
                          label: 'SAVE {{saved_percentage}}',
                          selectedByDefault: false,
                          showAsSoldOut: false
                        }]);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px dashed #dfe3e8',
                        borderRadius: '8px',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#008060'
                      }}
                    >
                      + Add discount rule
                    </button>
                  </div>
                </div>
              
              {/* Right Column - Preview */}
              <div style={{ position: 'sticky', top: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Preview</h3>
                <p className="polaris-text-subdued" style={{ fontSize: '13px', marginBottom: '12px' }}>
                  {offerTypes.find(type => type.id === offerType)?.description}
                </p>
                
                {/* Preview Card - Same as Step 1 */}
                <div style={{ 
                  width: '100%',
                  minHeight: '300px',
                  border: '1px solid #dfe3e8', 
                  borderRadius: '8px', 
                  padding: '16px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {offerType === 'quantity-breaks-same' && (
                    <>
                      <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#f9fafb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '14px' }}>Single</strong>
                            <div style={{ fontSize: '12px', color: '#6d7175' }}>Standard price</div>
                          </div>
                          <strong style={{ fontSize: '16px' }}>€65,00</strong>
                        </div>
                      </div>
                      <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '12px', position: 'relative', background: '#ffffff' }}>
                        <div style={{ position: 'absolute', top: '-8px', right: '12px', background: '#000', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600 }}>
                          Most Popular
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '14px' }}>Duo</strong>
                              <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE €19,50</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#6d7175' }}>You save 15%</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '16px' }}>€110,50</strong>
                            <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€130,00</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 'auto', padding: '12px 0' }}>
                        <strong style={{ fontSize: '13px' }}>Quantity breaks for the same product</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            </>
          )}
          
          {step === 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
              {/* Left Column - Form */}
              <div>
                <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Style Design</h2>
                <p className="polaris-text-subdued">Customize the appearance of your bundle widget</p>
              
              {/* Layout Format */}
              <div style={{ marginTop: '24px' }}>
                <label style={{ fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '12px' }}>
                  Layout Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ 
                    border: '2px solid #dfe3e8', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Vertical Stack</div>
                    <div style={{ fontSize: '12px', color: '#6d7175' }}>Products stacked vertically</div>
                  </div>
                  <div style={{ 
                    border: '2px solid #dfe3e8', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Horizontal Grid</div>
                    <div style={{ fontSize: '12px', color: '#6d7175' }}>Products in a row</div>
                  </div>
                  <div style={{ 
                    border: '2px solid #dfe3e8', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Card Grid</div>
                    <div style={{ fontSize: '12px', color: '#6d7175' }}>2x2 grid layout</div>
                  </div>
                  <div style={{ 
                    border: '2px solid #dfe3e8', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Compact List</div>
                    <div style={{ fontSize: '12px', color: '#6d7175' }}>Condensed view</div>
                  </div>
                </div>
              </div>

              {/* Card Colors */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Card Colors</h3>
                <div className="polaris-grid">
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Card Background Color
                    <input 
                      type="color" 
                      defaultValue="#ffffff"
                      style={{
                        width: '100%',
                        height: '40px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px'
                      }}
                    />
                  </label>
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Card Label Color
                    <input 
                      type="color" 
                      defaultValue="#008060"
                      style={{
                        width: '100%',
                        height: '40px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px'
                      }}
                    />
                  </label>
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Border Style
                    <select 
                      defaultValue="solid"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Border Color
                    <input 
                      type="color" 
                      defaultValue="#dfe3e8"
                      style={{
                        width: '100%',
                        height: '40px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px'
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Card Title */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Card Title</h3>
                <div className="polaris-grid">
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Title Text
                    <input 
                      type="text" 
                      defaultValue="Bundle & Save"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </label>
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Font Size
                    <select 
                      defaultValue="16"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="12">12px</option>
                      <option value="14">14px</option>
                      <option value="16">16px</option>
                      <option value="18">18px</option>
                      <option value="20">20px</option>
                      <option value="24">24px</option>
                      <option value="28">28px</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Font Style
                    <select 
                      defaultValue="bold"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="600">Semi Bold</option>
                      <option value="300">Light</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Title Color
                    <input 
                      type="color" 
                      defaultValue="#202223"
                      style={{
                        width: '100%',
                        height: '40px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px'
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Button Styles */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Button Styles</h3>
                <div className="polaris-grid">
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Primary Color
                    <input 
                      type="color" 
                      defaultValue="#008060"
                      style={{
                        width: '100%',
                        height: '40px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px'
                      }}
                    />
                  </label>
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Button Text
                    <input 
                      type="text" 
                      defaultValue="Add to Cart"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Promotional Features */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Promotional Features</h3>
                
                <div style={{ 
                  border: '1px solid #dfe3e8', 
                  borderRadius: '8px', 
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      defaultChecked={true}
                      style={{ marginRight: '8px', width: '16px', height: '16px' }} 
                    />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Show Strikethrough Price</span>
                  </label>
                  <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                    Display original price with strikethrough to highlight savings
                  </p>
                </div>

                <div style={{ 
                  border: '1px solid #dfe3e8', 
                  borderRadius: '8px', 
                  padding: '16px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      defaultChecked={false}
                      style={{ marginRight: '8px', width: '16px', height: '16px' }} 
                    />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Enable Countdown Timer</span>
                  </label>
                  <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                    Add urgency with a countdown timer
                  </p>
                  
                  <div style={{ marginTop: '12px', marginLeft: '24px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500 }}>
                      Timer Duration
                      <select 
                        defaultValue="24"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          marginTop: '8px',
                          border: '1px solid #dfe3e8',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="1">1 Hour</option>
                        <option value="6">6 Hours</option>
                        <option value="12">12 Hours</option>
                        <option value="24">24 Hours</option>
                        <option value="48">48 Hours</option>
                        <option value="72">72 Hours</option>
                      </select>
                    </label>
                    
                    <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginTop: '12px' }}>
                      Timer Style
                      <select 
                        defaultValue="minimal"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          marginTop: '8px',
                          border: '1px solid #dfe3e8',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="minimal">Minimal (00:00:00)</option>
                        <option value="badge">Badge Style</option>
                        <option value="boxed">Boxed Numbers</option>
                      </select>
                    </label>

                    <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginTop: '12px' }}>
                      Timer Color
                      <input 
                        type="color" 
                        defaultValue="#d82c0d"
                        style={{
                          width: '100%',
                          height: '40px',
                          marginTop: '8px',
                          border: '1px solid #dfe3e8',
                          borderRadius: '6px'
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              </div>
              
              {/* Right Column - Preview */}
              <div style={{ position: 'sticky', top: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Live Preview</h3>
                
                {/* Preview Card */}
                <div style={{ 
                  width: '100%',
                  border: '1px solid #dfe3e8', 
                  borderRadius: '12px', 
                  padding: '20px',
                  background: '#ffffff'
                }}>
                  {/* Card Title */}
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    color: '#202223',
                    marginBottom: '16px'
                  }}>
                    Bundle & Save
                  </h3>
                  
                  {/* Countdown Timer (when enabled) */}
                  <div style={{ 
                    background: '#fff8f0', 
                    border: '1px solid #ffd700',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#6d7175', marginBottom: '4px' }}>
                      ⏱️ Limited time offer ends in
                    </div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: '#d82c0d',
                      fontFamily: 'monospace'
                    }}>
                      23:45:12
                    </div>
                  </div>
                  
                  {/* Product Items */}
                  <div style={{ 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px', 
                    padding: '12px',
                    marginBottom: '10px',
                    background: '#f9fafb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '13px' }}>Single Item</strong>
                        <div style={{ fontSize: '11px', color: '#6d7175' }}>Standard price</div>
                      </div>
                      <strong style={{ fontSize: '14px' }}>€65,00</strong>
                    </div>
                  </div>
                  
                  <div style={{ 
                    border: '2px solid #008060', 
                    borderRadius: '8px', 
                    padding: '12px',
                    position: 'relative',
                    background: '#ffffff',
                    marginBottom: '10px'
                  }}>
                    <div style={{ 
                      position: 'absolute', 
                      top: '-8px', 
                      right: '12px', 
                      background: '#008060', 
                      color: '#fff', 
                      padding: '2px 10px', 
                      borderRadius: '12px', 
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      BEST VALUE
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '13px' }}>Bundle Deal</strong>
                          <span style={{ 
                            background: '#008060', 
                            color: '#fff',
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '10px',
                            fontWeight: 600
                          }}>
                            SAVE 20%
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#6d7175' }}>You save €26,00</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '14px' }}>€104,00</strong>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#6d7175', 
                          textDecoration: 'line-through' 
                        }}>
                          €130,00
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <button style={{
                    width: '100%',
                    background: '#008060',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '12px'
                  }}>
                    Add to Cart
                  </button>
                  
                  {/* Features/Benefits */}
                  <div style={{ 
                    marginTop: '12px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid #e0e0e0',
                    fontSize: '12px',
                    color: '#6d7175'
                  }}>
                    <div style={{ marginBottom: '6px' }}>✓ Free shipping on bundles</div>
                    <div style={{ marginBottom: '6px' }}>✓ 30-day money-back guarantee</div>
                    <div>✓ Exclusive bundle pricing</div>
                  </div>
                </div>
                
                <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '12px', fontStyle: 'italic' }}>
                  Note: This is a live preview. Changes will update in real-time when state is connected.
                </p>
              </div>
            </div>
          )}
          
          {step === 4 && (
            <div>
              <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Targeting & Settings</h2>
              
              {/* Target Audience */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Target Audience</h3>
                <div className="polaris-stack polaris-stack--vertical">
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Customer Segments
                    <div style={{
                      marginTop: '8px',
                      border: '1px solid #dfe3e8',
                      borderRadius: '6px',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" defaultChecked style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>All Customers</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>VIP Customers</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>New Customers</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>Returning Customers</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>High-Value Customers</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>At-Risk Customers</span>
                      </label>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                      Select one or more customer segments to target
                    </p>
                  </label>
                  
                  <label style={{ fontSize: '14px', fontWeight: 500, marginTop: '16px' }}>
                    Market Visibility
                    <div style={{
                      marginTop: '8px',
                      border: '1px solid #dfe3e8',
                      borderRadius: '6px',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" defaultChecked style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>All Markets</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>United States</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>Europe</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>United Kingdom</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>Canada</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>Australia</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '14px' }}>Asia Pacific</span>
                      </label>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                      Select which markets can see this offer
                    </p>
                  </label>
                </div>
              </div>

              {/* Schedule */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Schedule</h3>
                <div className="polaris-grid">
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Start Time
                    <input 
                      type="datetime-local"
                      step="1"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                      When the offer becomes active
                    </p>
                  </label>
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    End Time
                    <input 
                      type="datetime-local"
                      step="1"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                      When the offer expires
                    </p>
                  </label>
                </div>
              </div>

              {/* Budget */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Budget</h3>
                <div className="polaris-grid">
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Total Budget (Optional)
                    <input 
                      type="number"
                      placeholder="$0.00"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                      Maximum total spend for this offer
                    </p>
                  </label>
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Daily Budget (Optional)
                    <input 
                      type="number"
                      placeholder="$0.00"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                      Maximum spend per day
                    </p>
                  </label>
                </div>
              </div>

              {/* Risk Control */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Risk Control</h3>
                <div className="polaris-stack polaris-stack--vertical">
                  <label style={{ fontSize: '14px', fontWeight: 500 }}>
                    Usage Limit Per Customer
                    <select 
                      defaultValue="unlimited"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginTop: '8px',
                        border: '1px solid #dfe3e8',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="unlimited">Unlimited</option>
                      <option value="1">1 time only</option>
                      <option value="2">2 times</option>
                      <option value="3">3 times</option>
                      <option value="5">5 times</option>
                      <option value="10">10 times</option>
                      <option value="custom">Custom...</option>
                    </select>
                    <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                      How many times each customer can use this offer
                    </p>
                  </label>
                  
                  <div style={{ 
                    marginTop: '16px',
                    border: '1px solid #dfe3e8', 
                    borderRadius: '8px', 
                    padding: '16px'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        defaultChecked={true}
                        style={{ marginRight: '8px', width: '16px', height: '16px' }} 
                      />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Hide offer after expiration</span>
                    </label>
                    <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                      Don't display the offer widget after the end date
                    </p>
                  </div>

                  <div style={{ 
                    marginTop: '16px',
                    border: '1px solid #dfe3e8', 
                    borderRadius: '8px', 
                    padding: '16px'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        defaultChecked={false}
                        style={{ marginRight: '8px', width: '16px', height: '16px' }} 
                      />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Show offer to bots/crawlers</span>
                    </label>
                    <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                      Display offer information to search engine crawlers and bots
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed Bottom Action Bar */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        background: '#ffffff', 
        borderTop: '1px solid #dfe3e8',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        zIndex: 100,
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        {step > 1 && (
          <button 
            className="polaris-button polaris-button--plain"
            onClick={() => setStep(step - 1)}
          >
            Previous
          </button>
        )}
        <button 
          className="polaris-button"
          onClick={() => step < 4 ? setStep(step + 1) : navigate('/offers', { state: { showPublishGuide: true } })}
        >
          {step === 4 ? 'Create Offer' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function ABTestEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [testName, setTestName] = useState('');
  const [selectedOffer, setSelectedOffer] = useState('');
  const [variantTraffic, setVariantTraffic] = useState(50);
  const [controlDiscount, setControlDiscount] = useState('10');
  const [controlDiscountType, setControlDiscountType] = useState('percentage');
  const [controlMinAmount, setControlMinAmount] = useState('');
  const [controlBuyQuantity, setControlBuyQuantity] = useState('2');
  const [controlGetQuantity, setControlGetQuantity] = useState('1');
  const [variantDiscount, setVariantDiscount] = useState('15');
  const [variantDiscountType, setVariantDiscountType] = useState('percentage');
  const [variantMinAmount, setVariantMinAmount] = useState('');
  const [variantBuyQuantity, setVariantBuyQuantity] = useState('3');
  const [variantGetQuantity, setVariantGetQuantity] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Mock available offers with different types
  const availableOffers = [
    { id: '1', name: 'Summer Bundle', type: 'percentage_discount' },
    { id: '2', name: 'Winter Sale Pack', type: 'fixed_discount' },
    { id: '3', name: 'Spring Collection', type: 'buy_x_get_y' },
    { id: '4', name: 'Fall Essentials', type: 'percentage_discount' },
    { id: '5', name: 'Holiday Special', type: 'bundle_price' },
  ];
  
  const selectedOfferData = availableOffers.find(o => o.id === selectedOffer);
  const offerType = selectedOfferData?.type || '';
  
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px] pb-[80px] sm:pb-[100px]">
      {/* Header */}
      <div className="mb-[16px] sm:mb-[24px]">
        <button 
          className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[8px] py-[4px] rounded-[6px] mb-[12px]"
          onClick={() => navigate('/')}
        >
          ← Back
        </button>
        <h1 className="font-['Inter'] font-semibold text-[20px] sm:text-[24px] leading-[30px] sm:leading-[36px] text-[#202223] tracking-[0.0703px] m-0">
          Create A/B Test
        </h1>
        <p className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] mt-[4px]">
          Set up an A/B test to compare different bundle offers
        </p>
      </div>
      
      {/* Form */}
      <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px] sm:p-[24px] mb-[16px] sm:mb-[24px]">
        {/* Test Name */}
        <div className="mb-[24px]">
          <label className="block font-['Inter'] font-semibold text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
            Test Name
          </label>
          <input 
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g., Summer Bundle Discount Test"
            className="w-full px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
          />
        </div>
        
        {/* Select Offer */}
        <div className="mb-[24px]">
          <label className="block font-['Inter'] font-semibold text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
            Select Offer to Test
          </label>
          <p className="font-['Inter'] font-normal text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px] mb-[12px]">
            Choose an existing offer to create A/B test variants
          </p>
          <select 
            value={selectedOffer}
            onChange={(e) => setSelectedOffer(e.target.value)}
            className="w-full px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060] bg-white"
          >
            <option value="">Select an offer...</option>
            {availableOffers.map(offer => (
              <option key={offer.id} value={offer.id}>
                {offer.name} ({offer.type.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>
        
        {/* Variant Traffic Split */}
        <div className="mb-[24px]">
          <label className="block font-['Inter'] font-semibold text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
            Variant Traffic Split
          </label>
          <p className="font-['Inter'] font-normal text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px] mb-[12px]">
            Control group receives {100 - variantTraffic}% of traffic, variant receives {variantTraffic}%
          </p>
          <div className="flex items-center gap-[16px]">
            <input 
              type="range"
              min="10"
              max="90"
              value={variantTraffic}
              onChange={(e) => setVariantTraffic(Number(e.target.value))}
              className="flex-1"
              style={{
                accentColor: '#008060'
              }}
            />
            <div className="w-[80px] px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] text-center font-['Inter'] font-semibold text-[14px] leading-[22.4px] text-[#202223]">
              {variantTraffic}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Variant Comparison - Two Columns - Only show if offer is selected */}
      {selectedOffer && (
        <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px] sm:p-[24px] mb-[16px] sm:mb-[24px]">
          <h2 className="font-['Inter'] font-semibold text-[16px] sm:text-[18px] leading-[24px] sm:leading-[27px] text-[#202223] tracking-[-0.3203px] mb-[16px] sm:mb-[20px]">
            Offer Configuration
          </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px] sm:gap-[24px]">
          {/* Control Group (Left) */}
          <div className="border border-[#c4cdd5] rounded-[8px] p-[20px]">
            <h3 className="font-['Inter'] font-semibold text-[16px] leading-[24px] text-[#202223] tracking-[-0.3125px] mb-[16px] flex items-center gap-[8px]">
              <span className="bg-[#f4f6f8] px-[8px] py-[4px] rounded-[4px] text-[13px]">Control</span>
              Control Group
            </h3>
            
            {/* Percentage Discount or Fixed Discount */}
            {(offerType === 'percentage_discount' || offerType === 'fixed_discount') && (
              <>
                <div className="mb-[16px]">
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Discount Amount
                  </label>
                  <div className="flex gap-[8px]">
                    <input 
                      type="text"
                      value={controlDiscount}
                      onChange={(e) => setControlDiscount(e.target.value)}
                      placeholder="10"
                      className="flex-1 px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                    <select 
                      value={controlDiscountType}
                      onChange={(e) => setControlDiscountType(e.target.value)}
                      className="px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060] bg-white"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">$</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Minimum Purchase Amount
                  </label>
                  <div className="flex items-center gap-[8px]">
                    <span className="font-['Inter'] font-normal text-[14px] text-[#6d7175]">$</span>
                    <input 
                      type="text"
                      value={controlMinAmount}
                      onChange={(e) => setControlMinAmount(e.target.value)}
                      placeholder="50"
                      className="flex-1 px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                  </div>
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Leave empty for no minimum
                  </p>
                </div>
              </>
            )}
            
            {/* Buy X Get Y */}
            {offerType === 'buy_x_get_y' && (
              <>
                <div className="mb-[16px]">
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Buy Quantity
                  </label>
                  <input 
                    type="text"
                    value={controlBuyQuantity}
                    onChange={(e) => setControlBuyQuantity(e.target.value)}
                    placeholder="2"
                    className="w-full px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                  />
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Number of items customer must purchase
                  </p>
                </div>
                
                <div>
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Get Quantity
                  </label>
                  <input 
                    type="text"
                    value={controlGetQuantity}
                    onChange={(e) => setControlGetQuantity(e.target.value)}
                    placeholder="1"
                    className="w-full px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                  />
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Number of free items customer receives
                  </p>
                </div>
              </>
            )}
            
            {/* Bundle Price */}
            {offerType === 'bundle_price' && (
              <>
                <div className="mb-[16px]">
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Bundle Price
                  </label>
                  <div className="flex items-center gap-[8px]">
                    <span className="font-['Inter'] font-normal text-[14px] text-[#6d7175]">$</span>
                    <input 
                      type="text"
                      value={controlDiscount}
                      onChange={(e) => setControlDiscount(e.target.value)}
                      placeholder="99.99"
                      className="flex-1 px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                  </div>
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Fixed price for the entire bundle
                  </p>
                </div>
                
                <div>
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Regular Price
                  </label>
                  <div className="flex items-center gap-[8px]">
                    <span className="font-['Inter'] font-normal text-[14px] text-[#6d7175]">$</span>
                    <input 
                      type="text"
                      value={controlMinAmount}
                      onChange={(e) => setControlMinAmount(e.target.value)}
                      placeholder="149.99"
                      className="flex-1 px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                  </div>
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Original price shown for comparison
                  </p>
                </div>
              </>
            )}
          </div>
          
          {/* Variant Group (Right) */}
          <div className="border border-[#008060] rounded-[8px] p-[20px] bg-[rgba(0,128,96,0.02)]">
            <h3 className="font-['Inter'] font-semibold text-[16px] leading-[24px] text-[#202223] tracking-[-0.3125px] mb-[16px] flex items-center gap-[8px]">
              <span className="bg-[#008060] text-white px-[8px] py-[4px] rounded-[4px] text-[13px]">Variant</span>
              Variant Group
            </h3>
            
            {/* Percentage Discount or Fixed Discount */}
            {(offerType === 'percentage_discount' || offerType === 'fixed_discount') && (
              <>
                <div className="mb-[16px]">
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Discount Amount
                  </label>
                  <div className="flex gap-[8px]">
                    <input 
                      type="text"
                      value={variantDiscount}
                      onChange={(e) => setVariantDiscount(e.target.value)}
                      placeholder="15"
                      className="flex-1 px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                    <select 
                      value={variantDiscountType}
                      onChange={(e) => setVariantDiscountType(e.target.value)}
                      className="px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060] bg-white"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">$</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Minimum Purchase Amount
                  </label>
                  <div className="flex items-center gap-[8px]">
                    <span className="font-['Inter'] font-normal text-[14px] text-[#6d7175]">$</span>
                    <input 
                      type="text"
                      value={variantMinAmount}
                      onChange={(e) => setVariantMinAmount(e.target.value)}
                      placeholder="50"
                      className="flex-1 px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                  </div>
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Leave empty for no minimum
                  </p>
                </div>
              </>
            )}
            
            {/* Buy X Get Y */}
            {offerType === 'buy_x_get_y' && (
              <>
                <div className="mb-[16px]">
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Buy Quantity
                  </label>
                  <input 
                    type="text"
                    value={variantBuyQuantity}
                    onChange={(e) => setVariantBuyQuantity(e.target.value)}
                    placeholder="3"
                    className="w-full px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                  />
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Number of items customer must purchase
                  </p>
                </div>
                
                <div>
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Get Quantity
                  </label>
                  <input 
                    type="text"
                    value={variantGetQuantity}
                    onChange={(e) => setVariantGetQuantity(e.target.value)}
                    placeholder="1"
                    className="w-full px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                  />
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Number of free items customer receives
                  </p>
                </div>
              </>
            )}
            
            {/* Bundle Price */}
            {offerType === 'bundle_price' && (
              <>
                <div className="mb-[16px]">
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Bundle Price
                  </label>
                  <div className="flex items-center gap-[8px]">
                    <span className="font-['Inter'] font-normal text-[14px] text-[#6d7175]">$</span>
                    <input 
                      type="text"
                      value={variantDiscount}
                      onChange={(e) => setVariantDiscount(e.target.value)}
                      placeholder="89.99"
                      className="flex-1 px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                  </div>
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Fixed price for the entire bundle
                  </p>
                </div>
                
                <div>
                  <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
                    Regular Price
                  </label>
                  <div className="flex items-center gap-[8px]">
                    <span className="font-['Inter'] font-normal text-[14px] text-[#6d7175]">$</span>
                    <input 
                      type="text"
                      value={variantMinAmount}
                      onChange={(e) => setVariantMinAmount(e.target.value)}
                      placeholder="149.99"
                      className="flex-1 px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                  </div>
                  <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
                    Original price shown for comparison
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}
      
      {/* Schedule */}
      <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[24px] mb-[24px]">
        <h2 className="font-['Inter'] font-semibold text-[18px] leading-[27px] text-[#202223] tracking-[-0.3203px] mb-[20px]">
          Schedule
        </h2>
        
        <div className="grid grid-cols-2 gap-[20px]">
          <div>
            <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
              Start Date & Time
            </label>
            <input 
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
            />
          </div>
          
          <div>
            <label className="block font-['Inter'] font-medium text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] mb-[8px]">
              End Date & Time
            </label>
            <input 
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-[12px] py-[8px] border border-[#c4cdd5] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px] focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
            />
            <p className="font-['Inter'] font-normal text-[12px] leading-[19.2px] text-[#6d7175] mt-[6px]">
              Leave empty to run indefinitely
            </p>
          </div>
        </div>
      </div>
      
      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#dfe3e8] px-[24px] py-[16px] flex justify-center items-center gap-[12px] shadow-[0_-2px_8px_rgba(0,0,0,0.1)]" style={{ zIndex: 100 }}>
        <button 
          className="bg-white border border-[#c4cdd5] text-[#202223] px-[20px] py-[10px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] cursor-pointer hover:bg-[#f4f6f8] transition-colors"
          onClick={() => navigate('/')}
        >
          Cancel
        </button>
        <button 
          className="bg-[#008060] text-white px-[20px] py-[10px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
          onClick={() => navigate('/')}
        >
          Create A/B Test
        </button>
      </div>
    </div>
  );
}

function OffersManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPublishGuide, setShowPublishGuide] = useState(false);
  
  console.log('OffersManagement render, showPublishGuide:', showPublishGuide);
  
  // Check if we came from create offer page
  React.useEffect(() => {
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
        onClick={() => navigate('/')}
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
            onClick={() => navigate('/create')}
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
                      onClick={() => navigate('/create')}
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
  );
}

function ABTestsManagement() {
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
        onClick={() => navigate('/')}
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
          onClick={() => navigate('/ab-test/1')}
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
                      onClick={() => navigate(`/ab-test/${test.id}`)}
                      title="View Details"
                    >
                      <ChartBar size={16} />
                    </button>
                    <button 
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      onClick={() => navigate(`/ab-test/${test.id}`)}
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
}

function Analytics() {
  const navigate = useNavigate();
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
            <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M2 6h12" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 2v2M11 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {timeRange}
        </button>
        
        <div style={{ position: 'relative' }}>
          <button 
            className="bg-white text-[#202223] px-[12px] py-[8px] rounded-[6px] font-['Inter'] font-normal text-[14px] leading-[21px] border border-[#c4cdd5] cursor-pointer hover:bg-[#f6f6f7] transition-colors flex items-center gap-[8px]"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
}

function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  const plans = [
    {
      name: 'Starter',
      monthlyPrice: '$29',
      yearlyPrice: '$290',
      features: ['Up to 5 active offers', '1,000 orders/month', 'Basic analytics', 'Email support']
    },
    {
      name: 'Professional',
      monthlyPrice: '$79',
      yearlyPrice: '$790',
      popular: true,
      features: ['Up to 20 active offers', '10,000 orders/month', 'Advanced analytics', 'A/B testing', 'Priority support']
    },
    {
      name: 'Enterprise',
      monthlyPrice: '$199',
      yearlyPrice: '$1,990',
      features: ['Unlimited offers', 'Unlimited orders', 'Custom analytics', 'A/B testing', 'Dedicated support', 'White label']
    }
  ];
  
  return (
    <div className="polaris-page">
      <div className="polaris-page__header">
        <div>
          <button className="polaris-button polaris-button--plain" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h1 className="polaris-page__title">Pricing Plans</h1>
        </div>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 className="polaris-text-heading-lg" style={{ marginBottom: '8px' }}>
          Choose the perfect plan for your business
        </h2>
        <p className="polaris-text-subdued">All plans include 14-day free trial. No credit card required.</p>
        
        {/* Billing Cycle Toggle */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '16px', 
          marginTop: '24px' 
        }}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: billingCycle === 'monthly' ? 600 : 400,
            color: billingCycle === 'monthly' ? '#202223' : '#6d7175'
          }}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            style={{
              position: 'relative',
              width: '52px',
              height: '28px',
              backgroundColor: billingCycle === 'yearly' ? '#008060' : '#c4cdd5',
              border: 'none',
              borderRadius: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              padding: 0
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: billingCycle === 'yearly' ? '26px' : '2px',
                width: '24px',
                height: '24px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: billingCycle === 'yearly' ? 600 : 400,
              color: billingCycle === 'yearly' ? '#202223' : '#6d7175'
            }}>
              Yearly
            </span>
            <span style={{
              backgroundColor: '#d1f7c4',
              color: '#108043',
              fontSize: '12px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              Save 17%
            </span>
          </div>
        </div>
      </div>
      
      <div className="polaris-grid grid grid-cols-1 md:grid-cols-3 gap-[16px] sm:gap-[24px]">
        {plans.map((plan, index) => (
          <div 
            key={index} 
            className="polaris-card"
            style={{
              border: plan.popular ? '2px solid #008060' : 'none',
              position: 'relative'
            }}
          >
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#008060',
                color: 'white',
                padding: '4px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                MOST POPULAR
              </div>
            )}
            
            <div className="polaris-stack polaris-stack--vertical" style={{ textAlign: 'center' }}>
              <h3 className="polaris-text-heading-md">{plan.name}</h3>
              <div style={{ margin: '16px 0' }}>
                <span style={{ fontSize: '36px', fontWeight: 600 }}>
                  {billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                </span>
                <span className="polaris-text-subdued">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
                {billingCycle === 'yearly' && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#108043', 
                    marginTop: '4px',
                    fontWeight: 500
                  }}>
                    ${(parseInt(plan.yearlyPrice.replace(/[$,]/g, '')) / 12).toFixed(0)}/month billed annually
                  </div>
                )}
              </div>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', textAlign: 'left' }}>
                {plan.features.map((feature, i) => (
                  <li key={i} style={{ padding: '8px 0', fontSize: '14px' }}>
                    ✓ {feature}
                  </li>
                ))}
              </ul>
              
              <button 
                className="polaris-button"
                style={{ width: '100%', marginTop: 'auto' }}
              >
                Start Free Trial
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="polaris-card" style={{ marginTop: '40px' }}>
        <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Frequently Asked Questions</h2>
        <div className="polaris-stack polaris-stack--vertical">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Can I change plans later?</h3>
            <p className="polaris-text-subdued">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>What happens after the trial?</h3>
            <p className="polaris-text-subdued">After your 14-day trial, you'll be charged based on your selected plan. You can cancel anytime.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Do you offer refunds?</h3>
            <p className="polaris-text-subdued">Yes, we offer a 30-day money-back guarantee for all plans.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#f4f6f8', padding: '16px' }}>
        <div style={{ maxWidth: '1359px', margin: '0 auto' }}>
          <Navigation />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateOffer />} />
            <Route path="/offers" element={<OffersManagement />} />
            <Route path="/ab-tests" element={<ABTestsManagement />} />
            <Route path="/ab-test/:id" element={<ABTestEdit />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/pricing" element={<Pricing />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}