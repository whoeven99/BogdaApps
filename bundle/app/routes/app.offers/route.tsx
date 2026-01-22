import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChartBar, Pencil, Copy, Trash2 } from 'lucide-react';
import { useNavigate, useLocation, useFetcher } from '@remix-run/react';
import { OfferType } from 'app/types';
import { useDispatch, useSelector } from 'react-redux';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { BatchQueryUserDiscount } from 'app/api/javaServer';
import { globalStore } from 'app/globalStore';
import { setOffersData } from 'app/store/modules/offersData';


const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const offersData: OfferType[] = useSelector((state: any) => state.offersData);

  const discountNodeDeleteFetcher = useFetcher<any>();
  const discountNodeStatusFetcher = useFetcher<any>();

  const [pageLoadingArr, setPageLoadingArr] = useState<string[]>(["offersData"]);

  const [deleteOfferInfo, setDeleteOfferInfo] = useState<any>(null);

  const [showPublishGuide, setShowPublishGuide] = useState(false);


  const newOffer = useMemo(
    () =>
      localStorage.getItem("ciwi_new_offer_id") || ""
    , [])

  // Check if we came from create offer page
  useEffect(() => {
    const state = location.state as { showPublishGuide?: boolean } | null;
    if (state && state.showPublishGuide) {
      // Small delay to ensure page has loaded
      setTimeout(() => {
        console.log('Setting showPublishGuide to true');
        setShowPublishGuide(true);
      }, 100);
      // Clear the state to prevent showing on refresh
      navigate('/app/offers', { replace: true, state: {} });
    }
    setTimeout(() => {
      batchQueryUserDiscount();
    }, 2000);
  }, [location.state]);

  useEffect(() => {
    if (discountNodeStatusFetcher.data) {
      if (discountNodeStatusFetcher.data.success) {
        const id = discountNodeStatusFetcher.data.response?.first;
        const status = discountNodeStatusFetcher.data.response?.second;

        const newOffers = Array.isArray(offersData) ? offersData.map(offer => {
          if (offer.id === id) {
            return {
              ...offer,
              status,
            }
          }
          return offer;
        }) : [];
        dispatch(setOffersData(newOffers));
      }
    }
  }, [discountNodeStatusFetcher.data]);

  useEffect(() => {
    if (discountNodeDeleteFetcher.data) {
      if (discountNodeDeleteFetcher.data.success) {
        const deleteDiscountGid = discountNodeDeleteFetcher.data.response;

        if (!offersData || !deleteDiscountGid) return;

        const newOffer = offersData.filter((offer) => offer.id !== deleteDiscountGid);

        dispatch(setOffersData(newOffer));
        setDeleteOfferInfo(null);
      }
    }
  }, [discountNodeDeleteFetcher.data]);

  const batchQueryUserDiscount = useCallback(async () => {
    const batchQueryUserDiscountData = await BatchQueryUserDiscount({
      shopName: globalStore.shop,
      server: globalStore.server,
    });

    if (batchQueryUserDiscountData.success) {
      const data = batchQueryUserDiscountData.response?.map((item: any) => (
        {
          id: item?.discountGid,
          name: item?.basic_information?.offerName,
          status: item?.status,
          metafields: item?.metafields,
          gmv: "",
          conversion: "",
          exposurePV: "",
          addToCartPV: "",
        }
      ))
      dispatch(setOffersData(data));
    }
    setPageLoadingArr([]);
  }, [globalStore.shop, globalStore.server]);

  const switchDiscountStatus = (
    {
      id,
      status,
    }:
      {
        id: string,
        status: boolean,
      }
  ) => {
    discountNodeStatusFetcher.submit(
      {
        discountNodeStatusRequestBody: JSON.stringify({
          id,
          status,
        })
      },
      {
        method: "POST",
      },
    );
  }

  const deleteOffer = async ({
    id,
    metafields
  }: {
    id: string,
    metafields: {
      ownerId: string,
      namespace: string,
      key: string
    }[]
  }) => {
    discountNodeDeleteFetcher.submit(
      {
        discountNodeDeleteRequestBody: JSON.stringify({
          id,
          metafields,
        })
      },
      {
        method: "POST",
      },
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
      {/* Back Button */}
      <button
        className="!text-[#008060] !font-['Inter'] !font-medium !text-[14px] !leading-[21px] !tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[8px] py-[4px] rounded-[6px] mb-[12px] flex items-center gap-[4px]"
        onClick={() => navigate('/app')}
      >
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px] sm:mb-[24px]">
        <div>
          <h1 className="!font-['Inter'] !font-semibold !text-[20px] !sm:text-[24px] !leading-[30px] !sm:leading-[36px] !text-[#202223] !tracking-[0.0703px] !m-0">
            All Offers
          </h1>
          <p className="!font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !text-[#6d7175] !mt-[4px]">
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

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        {pageLoadingArr.includes("offersData") && <Spin />}
        {!pageLoadingArr.includes("offersData") && offersData?.length === 0 && <span className="!font-['Inter'] !font-normal !text-[14px] !text-[#6d7175]">{t("No offers found")}</span>}
      </div>

      {/* Offers Table */}
      {(!pageLoadingArr.includes("offersData") && Array.isArray(offersData) && offersData?.length > 0) &&
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {offersData.map(offer => (
                <tr key={offer.id}>
                  <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {offer.name}
                      {newOffer === offer.id.toString() && <span
                        style={{
                          backgroundColor: "#00A47C",
                          color: "white",
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        NEW
                      </span>}
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
                  <td className="p-[12px] border-b border-[#dfe3e8]">
                    <div className="flex items-center gap-[8px]">
                      <button
                        className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                        onClick={() => navigate('/app/create')}
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
      }
    </div>
  )
};

export default Index;
