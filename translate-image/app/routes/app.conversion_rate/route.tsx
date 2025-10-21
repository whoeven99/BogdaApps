import {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
  json,
} from "@remix-run/node";
import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  Select,
  Text,
  InlineStack,
  Page,
  Layout,
  Grid,
  Popover,
  BlockStack,
  InlineGrid,
  Icon,
  Box,
} from "@shopify/polaris";
import { Flex, Row, Skeleton, Typography, Button, Divider, Empty } from "antd";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { AppstoreOutlined, BarsOutlined } from "@ant-design/icons";
import ScrollNotice from "~/components/ScrollNotice";
import { authenticate } from "../../shopify.server";
import { useFetcher } from "@remix-run/react";
import { GetConversionData } from "../../api/JavaServer";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@remix-run/react";
import useReport from "scripts/eventReport";
import LineChartECharts from "./components/LineChartECharts";
const { Title } = Typography;

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
    const polarisVizFetcher = JSON.parse(
      formData.get("polarisVizFetcher") as string,
    );
    if (polarisVizFetcher) {
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
        let storeLanguage = [] as string[];
        let defaultLanguage = "en";
        if (data.data.shopLocales.length > 0) {
          data.data.shopLocales.forEach((item: any) => {
            // storeLanguage.push(item.locale);
            if (item.primary) {
              defaultLanguage = item.locale;
            }
          });
        }
        const updatedStoreLanguage = storeLanguage.map((lang) =>
          lang === "zh-CN" ? "zh-hans" : lang,
        );
        const { days } = polarisVizFetcher;

        const response = await GetConversionData({
          shop,
          storeLanguage: updatedStoreLanguage,
          dayData: days,
        });
        return json({ ...response, defaultLanguage });
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

const Index = () => {
  const { report } = useReport();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [gridColumns, setGridColumns] = useState<number>(2); // 默认 2 列
  const polarisVizDataFetcher = useFetcher<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilterCondition, setCondition] = useState("last7");
  const [chartData, setChartData] = useState<any>([]);
  const [filteredChartData, setFilteredChartData] = useState<any>([]);
  const [defaultLanguage, setDefaultLanguage] = useState<string>("");

  const SkeletonGrid = ["1", "2", "3", "4"];
  const getLast24HoursRange = (): { start: Date; end: Date } => {
    const end = new Date(); // 现在
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // 一个星期前
    return { start, end };
  };
  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
  }>(getLast24HoursRange());

  const handleSwitcherTime = (column: number) => {
    setGridColumns(column);
  };
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);
  function formatDateLocalized(date: Date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  const generateDateRange = (start: Date, end: Date) => {
    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      const label = formatDateLocalized(current);
      dates.push(label);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };
  const clickReportDate = (day: number) => {
    report(
      { day: day },
      {
        action: "/app", // 默认 action 路径
        method: "post",
        eventType: "click",
      },
      "conversion_rate_filter_date",
    );
  };
  const clickReportGridColumns = (column: number) => {
    report(
      { gridColumns: column },
      {
        action: "/app", // 默认 action 路径
        method: "post",
        eventType: "click",
      },
      "conversion_rate_gridColumns",
    );
  };
  useEffect(() => {
    if (chartData.length === 0) return;
    const allDates = generateDateRange(selectedDates.start, selectedDates.end);
    const filled = chartData.map((chart: any) => {
      return {
        ...chart,
        language:
          chart.locale === defaultLanguage
            ? `${chart.language} (${t("Default Language")})`
            : chart.language,
        data: chart.data.map((series: any) => {
          const valueMap = new Map(
            Array.isArray(series.data)
              ? series.data.map((item: any) => [item.key, item.value])
              : [],
          );

          const alignedData = allDates.map((date) => ({
            key: date,
            value: valueMap.get(date) ?? 0,
          }));

          return {
            ...series,
            data: alignedData,
            name: `${formatDate(selectedDates.start)} ~ ${formatDate(
              selectedDates.end,
            )}`,
          };
        }),
      };
    });

    // 排序，确保默认语言在第一个
    const sorted = filled.sort((a: any, b: any) => {
      if (a.locale.includes(defaultLanguage)) return -1;
      if (b.locale.includes(defaultLanguage)) return 1;
      return 0;
    });

    setFilteredChartData(sorted);
  }, [selectedDates, chartData, defaultLanguage, t]);
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const setPreset = (type: string) => {
    setCondition(type);
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    if (type === "yesterday") {
      start.setDate(today.getDate() - 1);
      end = new Date(start);
    } else if (type === "last7") {
      start.setDate(today.getDate() - 6);
    } else if (type === "last30") {
      start.setDate(today.getDate() - 29);
    }

    // 归零到当天 00:00:00
    start.setHours(0, 0, 0, 0);
    // 设置到当天 23:59:59
    end.setHours(23, 59, 59, 999);

    setSelectedDates({ start, end });
  };

  useEffect(() => {
    const formData = new FormData();
    formData.append("polarisVizFetcher", JSON.stringify({ days: 30 }));
    polarisVizDataFetcher.submit(formData, {
      method: "post",
      action: "/app/conversion_rate",
    });
  }, []);

  function transformData(raw: any) {
    const languageMap: Record<string, string> = {
      en: "English",
      ja: "Japanese",
      "zh-hans": "简体中文",
      "zh-TW": "繁體中文",
      fr: "Français",
      de: "Deutsch",
      es: "Español",
      pt: "Português (Portugal)",
      "pt-BR": "Português (Brasil)",
      it: "Italiano",
      nl: "Nederlands",
      sv: "Svenska",
      da: "Dansk",
      no: "Norsk (Bokmål)",
      nn: "Norsk (Nynorsk)",
      fi: "Suomi",
      ko: "한국어",
      th: "ภาษาไทย",
      tr: "Türkçe",
      pl: "Polski",
      ru: "Русский",
      cs: "Čeština",
      hu: "Magyar",
      ro: "Română",
      el: "Ελληνικά",
      vi: "Tiếng Việt",
      ar: "العربية",
      he: "עברית",
      id: "Bahasa Indonesia",
      ms: "Bahasa Melayu",
      hi: "हिन्दी",
      bn: "বাংলা",
      ta: "தமிழ்",
      tl: "Filipino",
      bg: "Български",
      uk: "Українська",
      hr: "Hrvatski",
      sk: "Slovenčina",
      sl: "Slovenščina",
      et: "Eesti",
      lv: "Latviešu",
      lt: "Lietuvių",
      sr: "Српски",
      "sr-Latn": "Srpski",
      nb: "Norsk Bokmål",
      se: "Davvisámegiella (Northern Sami)",
      mg: "Malagasy",
      sw: "Kiswahili",
      zu: "isiZulu",
      "pt-PT": "Português (Portugal)",
      af: "Afrikaans",
      sq: "Shqip (Albanian)",
      am: "አማርኛ (Amharic)",
      hy: "Հայերեն (Armenian)",
      az: "Azərbaycan (Azerbaijani)",
      eu: "Euskara (Basque)",
      be: "Беларуская (Belarusian)",
      km: "ភាសាខ្មែរ (Khmer)",
      ky: "Кыргызча (Kyrgyz)",
      lo: "ລາວ (Lao)",
      mk: "Македонски (Macedonian)",
      mn: "Монгол (Mongolian)",
      fa: "فارسی (Persian)",
      ps: "پښتو (Pashto)",
      si: "සිංහල (Sinhala)",
      so: "Soomaali (Somali)",
      tg: "Тоҷикӣ (Tajik)",
      uz: "Oʻzbek (Uzbek)",
      ka: "ქართული (Georgian)",
      ga: "Gaeilge (Irish)",
      is: "Íslenska (Icelandic)",
      mt: "Malti (Maltese)",
      kk: "Қазақша (Kazakh)",
      tk: "Türkmen (Turkmen)",
      ur: "اردو (Urdu)",
      yi: "ייִדיש (Yiddish)",
    };

    function formatDateToChinese(dateStr: string) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }

    function getDateRangeName(dates: string[]) {
      if (!dates || dates.length === 0) return t("Unknown date range");
      if (dates.length === 1) return formatDateLocalized(new Date(dates[0]));
      return `${formatDateLocalized(new Date(dates[0]))} - ${formatDateLocalized(
        new Date(dates[dates.length - 1]),
      )}`;
    }

    const parsed = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});

    return Object.entries(parsed).map(([lang, dates]) => {
      const language = languageMap[lang] || lang; // 显示用
      const eventsByDate = typeof dates === "object" && dates ? dates : {};
      const sortedDates = Object.keys(eventsByDate).sort();
      const dateRangeName = getDateRangeName(sortedDates);

      const dateData = sortedDates.map((dateStr) => {
        const events = (dates as any)[dateStr] || {};
        const exposure = Number(events.page_viewed || 0);
        const clicks = Number(events.product_added_to_cart || 0);

        const conversionRate =
          exposure > 0 ? Math.min((clicks / exposure) * 100, 100) : 0;

        return {
          key: formatDateLocalized(new Date(dateStr)),
          value: Number.isFinite(conversionRate) ? conversionRate : 0,
        };
      });

      return {
        locale: lang, // ✅ 新增 locale
        language: lang, // ✅ 显示名
        data: [
          {
            name: dateRangeName,
            data: dateData,
          },
        ],
      };
    });
  }

  useEffect(() => {
    if (polarisVizDataFetcher.data) {
      console.log(polarisVizDataFetcher.data);
      
      if (polarisVizDataFetcher.data.success) {
        setChartData(transformData(polarisVizDataFetcher.data.response));
        setDefaultLanguage(polarisVizDataFetcher.data?.defaultLanguage);
        setFilteredChartData(
          transformData(polarisVizDataFetcher.data.response),
        );
      } else {
        setGridColumns(1);
      }
      setIsLoading(false);
    }
  }, [polarisVizDataFetcher.data]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return (
    <Page>
      {/* 筛选器 */}
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Button
          type="text"
          variant="outlined"
          onClick={() => navigate("/app")}
          style={{ padding: "4px" }}
        >
          <Icon source={ArrowLeftIcon} tone="base" />
        </Button>
        <Title
          style={{
            margin: "0",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}
        >
          {t("Add to Cart Conversion Rate")}
        </Title>
      </div>
      <div style={{ height: "20px" }}></div>
      <BlockStack>
        <Card>
          <Flex
            justify="space-between"
            align="center"
            style={{ width: "100%" }}
          >
            <InlineStack gap="200" align="center">
              <Button
                type={
                  currentFilterCondition === "yesterday" ? "primary" : "default"
                }
                onClick={() => {
                  setPreset("yesterday");
                  clickReportDate(1);
                }}
              >
                {t("Yesterday")}
              </Button>
              <Button
                type={
                  currentFilterCondition === "last7" ? "primary" : "default"
                }
                onClick={() => {
                  setPreset("last7"), clickReportDate(7);
                }}
              >
                {t("Last 7 Days")}
              </Button>
              <Button
                type={
                  currentFilterCondition === "last30" ? "primary" : "default"
                }
                onClick={() => {
                  setPreset("last30");
                  clickReportDate(30);
                }}
              >
                {t("Last 30 Days")}
              </Button>
            </InlineStack>
            <InlineStack gap="150">
              <Button
                type={gridColumns === 1 ? "primary" : "default"}
                onClick={() => {
                  handleSwitcherTime(1);
                  clickReportGridColumns(1);
                }}
                icon={<BarsOutlined />}
              />
              {!isMobile && (
                <Button
                  type={gridColumns === 2 ? "primary" : "default"}
                  onClick={() => {
                    handleSwitcherTime(2);
                    clickReportGridColumns(2);
                  }}
                  icon={<AppstoreOutlined />}
                />
              )}
            </InlineStack>
          </Flex>
        </Card>
      </BlockStack>
      <div style={{ height: "20px" }}></div>
      <Layout>
        <Layout.Section>
          <InlineGrid
            gap="400"
            columns={{
              xs: "1fr", // 手机：1列
              sm: "1fr", // 平板：2列
              md: `repeat(${gridColumns}, minmax(300px, 1fr))`, // 桌面：动态列数
            }}
          >
            {isLoading ? (
              SkeletonGrid.map((item: any, index: number) => {
                return (
                  <Card key={index}>
                    <Skeleton active paragraph={{ rows: 1 }} />
                    <Skeleton.Input
                      block
                      active
                      style={{ width: "100%", height: 200, borderRadius: 8 }}
                    />
                  </Card>
                );
              })
            ) : filteredChartData.length > 0 ? (
              filteredChartData.map((chart: any, index: number) => (
                <Card key={index}>
                  <Text as="h3" variant="headingSm">
                    {chart.language}
                  </Text>
                  <div
                    style={{
                      height: 300,
                      width: "100%",
                      // minWidth: 400,
                      marginTop: "16px",
                    }}
                  >
                    {Array.isArray(chart.data) &&
                    chart.data.length > 0 &&
                    ready ? (
                      <LineChartECharts data={chart.data} height={300} />
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </Card>
            )}
          </InlineGrid>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Index;
