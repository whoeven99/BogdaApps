import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page, Pagination, Select, Text, Thumbnail } from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { SearchOutlined } from "@ant-design/icons";
import { Empty, Input, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import {
  pickDefaultTargetLocale,
  SWITCHER_IMAGE_PAGE_SIZE,
  thirdPartyListHref,
  thirdPartyPagePath,
} from "~/lib/shopLocale";
import { authenticate } from "~/shopify.server";
import {
  listSwitcherPages,
  loadAdminShopLocales,
} from "~/server/contentImage/switcherImages.server";

const SEARCH_DEBOUNCE_MS = 400;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const locales = await loadAdminShopLocales(admin).catch(() => []);
  const requested = url.searchParams.get("language")?.trim() || "";
  const language =
    (requested && locales.some((row) => row.locale === requested) ? requested : "") ||
    pickDefaultTargetLocale(locales);
  const q = url.searchParams.get("q") ?? "";
  const after = url.searchParams.get("after");
  const page = language
    ? await listSwitcherPages({
        shop: session.shop,
        languageCode: language,
        q,
        after,
        locales: locales.map((row) => row.locale),
        primaryLocale: locales.find((row) => row.primary)?.locale,
      })
    : { rows: [], hasNextPage: false, endCursor: null as string | null };
  return json({
    shop: session.shop,
    language,
    q,
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
  const { language, q, locales, rows, hasNextPage, endCursor, skip } =
    useLoaderData<typeof loader>();
  const [draft, setDraft] = useState(q);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft.trim() === q.trim()) return;
      navigate(
        thirdPartyListHref({
          language,
          q: draft.trim() || undefined,
        }),
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, language, navigate, q]);

  const setLanguage = (value: string) => {
    navigate(thirdPartyListHref({ language: value, q: draft.trim() || undefined }));
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

  const searching = Boolean(q.trim());

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
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ width: 280 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t("thirdParty.searchPlaceholder")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
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
        <Empty
          description={
            searching ? (
              t("thirdParty.searchEmpty")
            ) : (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {t("thirdParty.emptyTitle")}
                </div>
                <div>{t("thirdParty.empty")}</div>
              </div>
            )
          }
        />
      ) : (
        <>
          <Table
            rowKey="pagePath"
            columns={columns}
            dataSource={rows}
            pagination={false}
            onRow={(row) => ({
              onClick: () =>
                navigate(thirdPartyPagePath(row.pagePath, language, q)),
              style: { cursor: "pointer" },
            })}
          />
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <Pagination
              hasPrevious={skip > 0}
              hasNext={hasNextPage}
              onPrevious={() => {
                const prev = Math.max(0, skip - SWITCHER_IMAGE_PAGE_SIZE);
                navigate(
                  thirdPartyListHref({
                    language,
                    q: q || undefined,
                    after: prev > 0 ? String(prev) : undefined,
                  }),
                );
              }}
              onNext={() => {
                if (!endCursor) return;
                navigate(
                  thirdPartyListHref({
                    language,
                    q: q || undefined,
                    after: endCursor,
                  }),
                );
              }}
            />
          </div>
        </>
      )}
    </Page>
  );
}
