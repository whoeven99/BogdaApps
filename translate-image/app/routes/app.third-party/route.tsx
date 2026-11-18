import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page, Pagination, Select, Text, Thumbnail } from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import {
  pickDefaultTargetLocale,
  SWITCHER_IMAGE_PAGE_SIZE,
  THIRD_PARTY_LIST_PATH,
  thirdPartyPagePath,
} from "~/lib/shopLocale";
import { authenticate } from "~/shopify.server";
import {
  listSwitcherPages,
  loadAdminShopLocales,
} from "~/server/contentImage/switcherImages.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const locales = await loadAdminShopLocales(admin).catch(() => []);
  const requested = url.searchParams.get("language")?.trim() || "";
  const language =
    (requested && locales.some((row) => row.locale === requested) ? requested : "") ||
    pickDefaultTargetLocale(locales);
  const after = url.searchParams.get("after");
  const page = language
    ? await listSwitcherPages({
        shop: session.shop,
        languageCode: language,
        after,
        locales: locales.map((row) => row.locale),
        primaryLocale: locales.find((row) => row.primary)?.locale,
      })
    : { rows: [], hasNextPage: false, endCursor: null as string | null };
  return json({
    shop: session.shop,
    language,
    locales,
    rows: page.rows,
    hasNextPage: page.hasNextPage,
    endCursor: page.endCursor,
    skip: Math.max(0, Number.parseInt(after ?? "", 10) || 0),
  });
};

export default function ThirdPartyPages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, locales, rows, hasNextPage, endCursor, skip } =
    useLoaderData<typeof loader>();

  const setLanguage = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("language", value);
    next.delete("after");
    navigate(`${THIRD_PARTY_LIST_PATH}?${next.toString()}`);
  };

  const columns: ColumnsType<(typeof rows)[number]> = [
    {
      title: t("Path"),
      dataIndex: "displayPath",
      key: "path",
      render: (_: string, row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Thumbnail source={row.coverUrl || ImageIcon} alt="" size="small" />
          {row.displayPath}
        </span>
      ),
    },
    {
      title: t("Images"),
      dataIndex: "total",
      key: "total",
      width: 100,
    },
    {
      title: t("Last seen"),
      dataIndex: "lastSeenAt",
      key: "lastSeenAt",
      width: 200,
      render: (value: string) => (value ? new Date(value).toLocaleString() : ""),
    },
  ];

  return (
    <Page
      backAction={{ content: t("Home"), onAction: () => navigate("/app") }}
    >
      <TitleBar title={t("Third-party images")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ width: 220 }}>
          <Select
            label={t("Language")}
            labelHidden
            options={locales.flatMap((row) =>
              row
                ? [{ label: row.name || row.locale, value: row.locale }]
                : [],
            )}
            value={language}
            onChange={setLanguage}
          />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Text as="p" tone="subdued">
          {t("thirdParty.hint")}
        </Text>
      </div>
      {rows.length === 0 ? (
        <Empty description={t("thirdParty.empty")} />
      ) : (
        <>
          <Table
            rowKey="pagePath"
            columns={columns}
            dataSource={rows}
            pagination={false}
            onRow={(row) => ({
              onClick: () => navigate(thirdPartyPagePath(row.pagePath, language)),
              style: { cursor: "pointer" },
            })}
          />
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <Pagination
              hasPrevious={skip > 0}
              hasNext={hasNextPage}
              onPrevious={() => {
                const next = new URLSearchParams(searchParams);
                const prev = Math.max(0, skip - SWITCHER_IMAGE_PAGE_SIZE);
                if (prev <= 0) next.delete("after");
                else next.set("after", String(prev));
                navigate(`${THIRD_PARTY_LIST_PATH}?${next.toString()}`);
              }}
              onNext={() => {
                if (!endCursor) return;
                const next = new URLSearchParams(searchParams);
                next.set("after", endCursor);
                navigate(`${THIRD_PARTY_LIST_PATH}?${next.toString()}`);
              }}
            />
          </div>
        </>
      )}
    </Page>
  );
}
