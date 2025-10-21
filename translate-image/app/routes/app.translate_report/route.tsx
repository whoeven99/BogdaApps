import React, { useEffect, useState, useMemo } from "react";
import {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  json,
} from "@remix-run/node";
import { authenticate } from "../../shopify.server";
import {
  GetRealTimeQuotaData,
  GetStoreLanguage,
  GetTranslationQualityScore,
} from "../../api/JavaServer";
import {
  Card,
  Button,
  Statistic,
  Row,
  Col,
  Divider,
  Flex,
  Typography,
  Tag,
  Progress,
  Result,
  Affix,
  Skeleton,
  Spin,
  Empty,
  Space,
  Grid,
} from "antd";
import { BlockStack, Page, Icon} from "@shopify/polaris";
// import { useLocation } from "@remix-run/react";
import ScrollNotice from "~/components/ScrollNotice";
import { useTranslation } from "react-i18next";
// import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { useNavigate, useFetcher } from "@remix-run/react";
import useReport from "scripts/eventReport";
// import TranslatedIcon from "app/components/translateIcon";
// import store from "~/store";
// import { RootState } from "~/store";
import { useSelector } from "react-redux";
const { Text, Title } = Typography;
interface RealTimeData {
  autoTranslate: false;
  glossary: false;
  switch: false;
}
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  return json({ shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  try {
    const formData = await request.formData();
    const LanguageFetcher = JSON.parse(
      formData.get("LanguageFetcher") as string,
    );
    const realTimeFetcher = JSON.parse(
      formData.get("realTimeFetcher") as string,
    );
    const translationScore = JSON.parse(
      formData.get("translationScore") as string,
    );
    if (translationScore) {
      try {
        const mutationResponse = await admin.graphql(
          `query MyQuery {
            shopLocales(published: true) {
              locale
              name
              primary
              published
            }
          }`,
        );
        const data = (await mutationResponse.json()) as any;
        let source = "en";
        if (data.data.shopLocales.length > 0) {
          data.data.shopLocales.forEach((item: any) => {
            if (item.primary === true) {
              source = item.locale;
            }
          });
        }
        const response = await GetTranslationQualityScore({
          shop,
          source: source,
        });

        return response;
      } catch (error) {
        console.log("get translation score failed", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

    if (LanguageFetcher) {
      try {
        const mutationResponse = await admin.graphql(
          `query MyQuery {
            shopLocales(published: true) {
              locale
              name
              primary
              published
            }
          }`,
        );
        const data = (await mutationResponse.json()) as any;
        let source = "en";
        if (data.data.shopLocales.length > 0) {
          data.data.shopLocales.forEach((item: any) => {
            if (item.primary === true) {
              source = item.locale;
            }
          });
        }
        const response = await GetStoreLanguage({
          shop,
          source: source,
        });
        return response;
      } catch (error) {
        console.log("get polarisViz data failed", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

    if (realTimeFetcher) {
      try {
        // const { languages, days } = LanguageFetcher;
        const response = await GetRealTimeQuotaData({
          shop,
        });
        return response;
      } catch (error) {
        console.log("get polarisViz data failed", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

    return json({ success: false, message: "conersion action Invalid data" });
  } catch (error) {
    console.error("Error action conversion route:", error);
    return json({ error: "Error action app" }, { status: 500 });
  }
};

const TranslationDashboard = () => {
  const { reportClick } = useReport();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const progressSize = screens.xs ? 80 : 120;
  const [isLoading, setLoading] = useState(false);
  const [realTimeIsLoading, setRealTimeIsLoading] = useState(false);
  const [reDectionLoading, setReDectionLoading] = useState(false);
  const translationEvaluationFetcher = useFetcher<any>();
  const storeLanguageFetcher = useFetcher<any>();
  const realTimeQuotaFetcher = useFetcher<any>();
  const [languageStatus, setLanguageStatus] = useState<boolean>(false);
  const [reportIntroduction, setReportIntroduction] = useState<{
    notTransLanguage: number | null;
    optimizationNotEnabled: number | null;
  }>({
    notTransLanguage: null,
    optimizationNotEnabled: null,
  });
  const [reportData, setReportData] = useState<any>({
    totalScore: null,
    language: [],
    realTimeBtns: {
      autoTranslate: false,
      glossary: false,
      switch: false,
      publishLanguage: false,
    },
  });
  //   const rows = useSelector((state: RootState) => state.languageTableData.rows);
  useEffect(() => {
    if (reportData && reportData.totalScore !== null) {
      localStorage.setItem("reportData", JSON.stringify(reportData));
    }
  }, [reportData]);
  useEffect(() => {
    // 查看浏览器有无存储报告数据
    const data = localStorage.getItem("reportData") as any;
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setReportData({
          totalScore: parsed.totalScore ?? null,
          language: parsed.language ?? [],
          realTimeBtns: parsed.realTimeBtns ?? {
            autoTranslate: false,
            glossary: false,
            switch: false,
            publishLanguage: false,
          },
        });
      } catch {
        console.error("localStorage 解析失败，使用默认值");
      }
    } else {
      console.log("发送请求");

      handleRequestReportData();
    }
  }, []);
  const optimizationNotEnabled = useMemo(() => {
    if (
      storeLanguageFetcher.state === "loading" ||
      realTimeQuotaFetcher.state === "loading"
    ) {
      return null; // 数据没准备好
    }

    let count = 0;
    Object.entries(reportData.realTimeBtns).forEach(([, value]) => {
      if (!value) count++;
    });
    return count;
  }, [reportData, storeLanguageFetcher.state, realTimeQuotaFetcher.state]);

  useEffect(() => {
    const length = reportData.language.filter(
      (item: any) => item[1] !== 1,
    ).length;

    setReportIntroduction({
      notTransLanguage: length,
      optimizationNotEnabled,
    });
  }, [reportData.language, optimizationNotEnabled]);
  const handleNavigate = () => {
    navigate("/app");
  };
  const handleReDetection = () => {
    setReDectionLoading(true);
    handleRequestReportData();
    reportClick("translate_report_retest");
  };
  const handleRequestReportData = () => {
    const formData = new FormData();
    formData.append("translationScore", JSON.stringify({}));
    translationEvaluationFetcher.submit(formData, {
      method: "post",
      action: "/app/translate_report",
    });
    setLoading(true);
    const languageFormData = new FormData();
    languageFormData.append("LanguageFetcher", JSON.stringify({}));
    storeLanguageFetcher.submit(languageFormData, {
      method: "post",
      action: "/app/translate_report",
    });
    setLanguageStatus(true);
    const realTimeFormData = new FormData();
    realTimeFormData.append("realTimeFetcher", JSON.stringify({}));
    realTimeQuotaFetcher.submit(realTimeFormData, {
      method: "post",
      action: "/app/translate_report",
    });
    setRealTimeIsLoading(true);
  };
  useEffect(() => {
    if (storeLanguageFetcher.data) {
      if (storeLanguageFetcher.data.success) {
        const languagesObj = { ...storeLanguageFetcher.data.response };
        const publishLang = languagesObj["Published Languages"] === 1;

        delete languagesObj["Published Languages"];
        delete languagesObj["English"];

        setReportData((prev: any) => {
          const next = {
            ...prev,
            realTimeBtns: {
              ...(prev.realTimeBtns ?? {}),
              publishLanguage: publishLang,
            },
            language: Object.entries(languagesObj),
          };
          return next;
        });

        setLanguageStatus(false);
      }
    }
  }, [storeLanguageFetcher.data]);
  useEffect(() => {
    if (realTimeQuotaFetcher.data) {
      if (realTimeQuotaFetcher.data.success) {
        setReportData((prev: any) => ({
          ...prev,
          realTimeBtns: {
            ...prev.realTimeBtns,
            ...realTimeQuotaFetcher.data.response,
          },
        }));
        setRealTimeIsLoading(false);
      }
    }
  }, [realTimeQuotaFetcher.data]);
  useEffect(() => {
    if (
      translationEvaluationFetcher.data &&
      translationEvaluationFetcher.data.success
    ) {
      setReportData((prev: any) => ({
        ...prev,
        totalScore: Math.ceil(
          translationEvaluationFetcher.data?.response * 100,
        ),
      }));
      localStorage.setItem(
        "translate_report_score",
        JSON.stringify(
          Math.ceil(translationEvaluationFetcher.data?.response * 100),
        ),
      );
      // const data = JSON.parse(localStorage.getItem("localAnalyticsData")!);
      // data.translateQualityScore = Math.ceil(
      //   translationEvaluationFetcher.data?.response * 100,
      // );
      // localStorage.setItem("localAnalyticsData", JSON.stringify(data));
      setLoading(false);
      setReDectionLoading(false);
    }
  }, [translationEvaluationFetcher.data]);
  return (
    <Page>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      {/* 头部卡片 - 翻译质量得分 */}
      <Affix offsetTop={0}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
            backgroundColor: "rgb(241, 241, 241)",
            padding: "16px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              type="text"
              variant="outlined"
              onClick={handleNavigate}
              style={{ padding: "4px" }}
            >
              {/* <Icon source={ArrowLeftIcon} tone="base" /> */}
            </Button>
            <Title
              style={{
                margin: "0",
                fontSize: "1.25rem",
                fontWeight: 700,
              }}
            >
              {t("Translation Quality Report")}
            </Title>
          </div>
          {isLoading ? (
            <Skeleton.Button active />
          ) : (
            <Button
              type="primary"
              loading={reDectionLoading}
              onClick={handleReDetection}
            >
              {t("Check")}
            </Button>
          )}
        </div>
      </Affix>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}></div>
      <Space direction="vertical" size={"middle"} style={{ width: "100%" }}>
        <Card
          title={t("Translation quality score")}
          style={{ width: "100%" }}
          styles={{
            header: { borderBottom: "none" },
            body: { padding: "12px 24px" },
          }}
        >
          {isLoading ? (
            <BlockStack>
              <Skeleton.Node
                active
                style={{ height: 100, width: "100%" }}
              ></Skeleton.Node>
            </BlockStack>
          ) : (
            <Row gutter={16}>
              <Col
                span={8}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Progress
                  type="circle"
                  percent={reportData.totalScore || 0}
                  size={progressSize}
                  format={(percent) => (
                    <span style={{ fontSize: 22, fontWeight: "bold" }}>
                      {percent}
                    </span>
                  )}
                  strokeColor={
                    reportData.totalScore >= 60
                      ? reportData.totalScore >= 80
                        ? "#52c41a"
                        : "#faad14"
                      : "#ff4d4f"
                  }
                />
              </Col>
              <Col
                span={16}
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                }}
              >
                <div style={{ lineHeight: 1.8, fontSize: "16px" }}>
                  <p>
                    {t(
                      "After AI evaluation, your website translation quality score is",
                    )}
                    <span
                      style={{
                        color:
                          reportData.totalScore >= 80
                            ? "#52c41a"
                            : reportData.totalScore >= 60
                              ? "#faad14"
                              : "#ff4d4f",
                        fontSize: "22px",
                        fontWeight: "bold",
                        padding: "0 6px",
                      }}
                    >
                      {reportData.totalScore || 0}
                    </span>
                    {t("points")}
                  </p>
                  <ul
                    style={{ listStyle: "none", padding: 0, margin: "12px 0" }}
                  >
                    <li>
                      {storeLanguageFetcher.state === "submitting" ? (
                        <Spin size="small" />
                      ) : (
                        <>
                          <span style={{ color: "red", fontWeight: "bold" }}>
                            {reportIntroduction.notTransLanguage}
                          </span>{" "}
                        </>
                      )}
                      {t("languages not translated")}
                    </li>

                    <li>
                      {storeLanguageFetcher.state === "submitting" ||
                      reportIntroduction.optimizationNotEnabled === null ? (
                        <Spin size="small" />
                      ) : (
                        <>
                          <span style={{ color: "red", fontWeight: "bold" }}>
                            {reportIntroduction.optimizationNotEnabled}
                          </span>{" "}
                        </>
                      )}
                      {t("translation optimization features not enabled")}
                    </li>
                  </ul>
                </div>
              </Col>
            </Row>
          )}
        </Card>
      </Space>
    </Page>
  );
};

export default TranslationDashboard;
