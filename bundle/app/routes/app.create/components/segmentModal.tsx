// import { X } from "lucide-react";
// import { useFetcher } from "@remix-run/react";
// import { useEffect, useRef, useState } from "react";
// import { Button, Space } from "antd";
// import { useTranslation } from "react-i18next";
// import { TargetingSettingsType } from "../route";

// interface segmentModalDataType {
//     data: {
//         label: string;
//         value: string
//     }[];
//     pageInfo: {
//         endCursor: string;
//         hasNextPage: boolean
//     }
// }

// interface SegmentModalProps {
//     mainModalType: "ProductVariants" | "CustomerSegments" | "Customer" | null;
//     setMainModalType: (modalType: "ProductVariants" | "CustomerSegments" | "Customer" | null) => void;
//     targetingSettingsData: TargetingSettingsType;
//     setTargetingSettingsData: (targetingSettingsData: TargetingSettingsType) => void;
// }

// const SegmentModal: React.FC<SegmentModalProps> = ({
//     mainModalType,
//     setMainModalType,
//     targetingSettingsData,
//     setTargetingSettingsData,
// }) => {
//     const { t } = useTranslation();
//     const segmentModalDataFetcher = useFetcher<any>();

//     const [selectedSegments, setSelectedSegments] = useState<{
//         label: string;
//         value: string
//     }[]>(targetingSettingsData.segmentData);
//     const [segmentModalData, setSegmentModalData] = useState<segmentModalDataType>({
//         data: [],
//         pageInfo: {
//             endCursor: "",
//             hasNextPage: false
//         }
//     });

//     const [searchQuery, setSearchQuery] = useState("");
//     const [debouncedQuery, setDebouncedQuery] = useState("");

//     const [searchLoading, setSearchLoading] = useState(false);
//     const [loadMoreLoading, setLoadMoreLoading] = useState(false);

//     const listRef = useRef<HTMLDivElement | null>(null);

//     useEffect(() => {
//         if (segmentModalDataFetcher.data) {
//             if (segmentModalDataFetcher.data.success) {
//                 console.log("segmentModalDataFetcher.data", segmentModalDataFetcher.data);
//                 const segmentsData = segmentModalDataFetcher.data.response?.segments?.nodes;
//                 const pageInfo = segmentModalDataFetcher.data.response?.segments?.pageInfo;
//                 if (segmentsData?.length) {
//                     const data: {
//                         label: string;
//                         value: string
//                     }[] = segmentsData.map((segment: any) => {
//                         return {
//                             label: segment.name,
//                             value: segment.id,
//                         }
//                     })
//                     if (loadMoreLoading) {
//                         setSegmentModalData({ data: [...segmentModalData.data, ...data], pageInfo });
//                         setLoadMoreLoading(false);
//                     } else {
//                         setSegmentModalData({ data, pageInfo });
//                         setSearchLoading(false);
//                     }
//                 }
//             }
//         }
//     }, [segmentModalDataFetcher.data])

//     useEffect(() => {
//         if (mainModalType !== "CustomerSegments") return;

//         const timer = setTimeout(() => {
//             setDebouncedQuery(searchQuery);
//             console.log("🔍 trigger search:", searchQuery);
//             setSearchLoading(true);
//         }, 400);

//         return () => clearTimeout(timer);
//     }, [searchQuery, mainModalType]);

//     useEffect(() => {
//         if (searchLoading) {
//             segmentModalDataFetcher.submit({
//                 customerSegmentsRequestBody: JSON.stringify({
//                     query: debouncedQuery,
//                 })
//             }, {
//                 method: "POST",
//             });
//         }
//         if (loadMoreLoading) {
//             segmentModalDataFetcher.submit({
//                 customerSegmentsRequestBody: JSON.stringify({
//                     query: debouncedQuery,
//                     endCursor: segmentModalData.pageInfo.endCursor,
//                 })
//             }, {
//                 method: "POST",
//             });
//         }
//     }, [searchLoading, loadMoreLoading])

//     const handleScroll = () => {
//         const el = listRef.current;
//         if (mainModalType !== "CustomerSegments" || !el || segmentModalDataFetcher.state === "submitting" || segmentModalData.pageInfo.hasNextPage === false) return;

//         const { scrollTop, scrollHeight, clientHeight } = el;

//         if (scrollTop + clientHeight >= scrollHeight - 50) {
//             // 触发加载更多（先不写）
//             console.log("⬇️ load more");
//             setLoadMoreLoading(true);
//         }
//     };

//     const onClose = () => {
//         setMainModalType(null);
//         setSearchQuery("");
//         setDebouncedQuery("");
//         setSearchLoading(false);
//         setLoadMoreLoading(false);
//         setSelectedSegments([]);
//         setSegmentModalData({
//             data: [],
//             pageInfo: {
//                 endCursor: "",
//                 hasNextPage: false
//             }
//         });
//     };

//     const onConfirm = () => {
//         setTargetingSettingsData({
//             ...targetingSettingsData,
//             segmentData: selectedSegments,
//         });
//         onClose();
//     };

//     return (
//         <div
//             style={{
//                 position: "fixed",
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//                 background: "rgba(0,0,0,0.5)",
//                 display: mainModalType === "CustomerSegments" ? "flex" : "none",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 zIndex: 1000,
//             }}
//         >
//             <div
//                 style={{
//                     background: "#fff",
//                     borderRadius: "12px",
//                     width: "90%",
//                     maxWidth: "800px",
//                     maxHeight: "90vh",
//                     padding: "24px",
//                     display: "flex",
//                     flexDirection: "column",
//                 }}
//             >
//                 {/* Header */}
//                 <div
//                     style={{
//                         display: "flex",
//                         justifyContent: "space-between",
//                         alignItems: "center",
//                         marginBottom: "20px",
//                     }}
//                 >
//                     <h2 style={{ fontSize: "18px", fontWeight: 600 }}>
//                         {t("Select Customer Segments")}
//                     </h2>
//                     <button
//                         onClick={onClose}
//                         style={{ background: "none", border: "none", cursor: "pointer" }}
//                     >
//                         <X size={24} />
//                     </button>
//                 </div>

//                 {/* Search */}
//                 <input
//                     type="text"
//                     placeholder={t("Search customer segments...")}
//                     value={searchQuery}
//                     onChange={(e) => setSearchQuery(e.target.value)}
//                     style={{
//                         width: "100%",
//                         padding: "10px 12px",
//                         border: "1px solid #dfe3e8",
//                         borderRadius: "6px",
//                         marginBottom: "12px",
//                         fontSize: "14px",
//                     }}
//                 />

//                 {searchLoading && (
//                     <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
//                         {t("Searching...")}
//                     </div>
//                 )}

//                 <div
//                     ref={listRef}
//                     onScroll={handleScroll}
//                     style={{
//                         display: "grid",
//                         gap: "12px",
//                         overflowY: "auto",
//                         flex: 1,
//                         marginBottom: 8
//                     }}
//                 >
//                     {segmentModalData.data.map((segment) => (
//                         <div
//                             key={segment.value}
//                             style={{
//                                 display: "flex",
//                                 gap: "12px",
//                                 padding: "12px",
//                                 border: "1px solid #dfe3e8",
//                                 borderRadius: "8px",
//                                 cursor: "pointer",
//                             }}
//                             onClick={() => {
//                                 if (!selectedSegments.find((s) => s.value === segment.value)) {
//                                     setSelectedSegments([...selectedSegments, segment]);
//                                 } else {
//                                     setSelectedSegments(selectedSegments.filter((s) => s.value !== segment.value));
//                                 }
//                             }}
//                         >
//                             <div style={{ flex: 1 }}>
//                                 <div style={{ fontWeight: 500 }}>{segment.label}</div>
//                             </div>
//                             <input
//                                 type="checkbox"
//                                 checked={selectedSegments.some((s) => s.value === segment.value)}
//                                 disabled={segmentModalDataFetcher.state === "submitting" || (selectedSegments.length >= 5 && !selectedSegments.some((s) => s.value === segment.value))}
//                                 readOnly
//                                 style={{ width: "20px", height: "20px" }}
//                             />
//                         </div>
//                     ))}

//                     {loadMoreLoading && (
//                         <div style={{ textAlign: "center", fontSize: 12, color: "#999" }}>
//                             {t("Loading more...")}
//                         </div>
//                     )}
//                 </div>

//                 <div
//                     style={{
//                         display: "flex",
//                         justifyContent: "space-between",
//                         alignItems: "center",
//                     }}
//                 >
//                     <span style={{ color: "#6d7175", fontSize: 12 }}>
//                         {selectedSegments.length}/5 {t("customer segments selected")}
//                     </span>
//                     <Button
//                         type="primary"
//                         onClick={onConfirm}
//                     >
//                         {t("Done")}
//                     </Button>
//                 </div>
//             </div >
//         </div >
//     );
// };

// export default SegmentModal;
