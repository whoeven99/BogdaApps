import { useNavigate, useParams } from "@remix-run/react";
import { useState } from "react";

const Index = () => {
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
                    onClick={() => navigate('/app')}
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
                    onClick={() => navigate('/app')}
                >
                    Cancel
                </button>
                <button
                    className="bg-[#008060] text-white px-[20px] py-[10px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
                    onClick={() => navigate('/app')}
                >
                    Create A/B Test
                </button>
            </div>
        </div>
    );
};

export default Index;