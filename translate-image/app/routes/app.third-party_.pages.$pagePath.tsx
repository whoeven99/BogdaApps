import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { Badge, Page, Thumbnail } from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { Button, Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import ScrollNotice from "~/components/ScrollNotice";
import {
  decodeSwitcherPagePathParam,
  displaySwitcherPagePath,
  THIRD_PARTY_LIST_PATH,
  thirdPartyImagePath,
} from "~/lib/shopLocale";
import { authenticate } from "~/shopify.server";
import {
  listSwitcherImages,
  loadAdminShopLocales,
} from "~/server/contentImage/switcherImages.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const pagePath = decodeSwitcherPagePathParam(params.pagePath ?? "") || "";
  const url = new URL(request.url);
  const locales = await loadAdminShopLocales(admin).catch(() => []);
  const language =
    url.searchParams.get("language")?.trim() ||
    locales.find((row) => !row.primary)?.locale ||
    locales[0]?.locale ||
    "";
  const rows = pagePath && language
    ? await listSwitcherImages({
        shop: session.shop,
        languageCode: language,
        pagePath,
      })
    : [];
  const primaryLocale = locales.find((row) => row.primary)?.locale;
  return json({
    shop: session.shop,
    language,
    pagePath,
    displayPath: displaySwitcherPagePath(
      pagePath,
      language,
      locales.map((row) => row.locale),
      primaryLocale,
    ),
    languageName: locales.find((row) => row.locale === language)?.name || language,
    rows,
  });
};

export default function ThirdPartyPageImages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language, pagePath, displayPath, languageName, rows } =
    useLoaderData<typeof loader>();

  const columns: ColumnsType<(typeof rows)[number]> = [
    {
      title: t("Image"),
      dataIndex: "imageBeforeUrl",
      key: "thumb",
      width: 80,
      render: (url: string) => <Thumbnail source={url || ImageIcon} alt="" size="small" />,
    },
    {
      title: t("Original image"),
      dataIndex: "imageBeforeUrl",
      key: "url",
      ellipsis: true,
    },
    {
      title: t("Status"),
      dataIndex: "translated",
      key: "translated",
      width: 120,
      render: (translated: boolean) =>
        translated ? (
          <Badge tone="success">{t("Translated")}</Badge>
        ) : (
          <Badge>{t("Not translated")}</Badge>
        ),
    },
    {
      title: "",
      key: "action",
      width: 120,
      render: (_: unknown, row) => (
        <Button
          type="link"
          onClick={() =>
            navigate(thirdPartyImagePath(row.urlKey, { pagePath, language }))
          }
        >
          {t("Translate")}
        </Button>
      ),
    },
  ];

  return (
    <Page
      backAction={{
        content: t("Third-party images"),
        onAction: () =>
          navigate(
            language
              ? `${THIRD_PARTY_LIST_PATH}?language=${encodeURIComponent(language)}`
              : THIRD_PARTY_LIST_PATH,
          ),
      }}
    >
      <TitleBar title={`${displayPath} · ${languageName}`} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      {rows.length === 0 ? (
        <Empty description={t("thirdParty.pageEmpty")} />
      ) : (
        <Table
          rowKey="urlKey"
          columns={columns}
          dataSource={rows}
          pagination={false}
        />
      )}
    </Page>
  );
}
