import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { Page, Thumbnail } from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { Button, Card, Empty, Flex, Image, Radio, Space, Upload } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AddCreaditsModal } from "~/routes/app._index/components/addCreditsModal";
import {
  DeleteProductImageLocal,
  UploadProductImage,
  fetchLocalQuota,
} from "~/api/pictureClient";
import { contentImageId } from "~/lib/contentPicture";
import { merchantImageCredits } from "~/lib/imageTranslate";
import {
  decodeSwitcherPagePathParam,
  thirdPartyListHref,
  thirdPartyPagePath,
} from "~/lib/shopLocale";
import { listPicturesByImageId } from "~/server/picture/picture.server";
import { translateImageToFiles } from "~/server/picture/translateImage.server";
import {
  getSwitcherImage,
  loadAdminShopLocales,
} from "~/server/contentImage/switcherImages.server";
import { authenticate } from "~/shopify.server";
import { setChars, setTotalChars } from "~/store/modules/userConfig";
import ScrollNotice from "~/components/ScrollNotice";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const urlKey = decodeSwitcherPagePathParam(params.urlKey ?? "") || "";
  const url = new URL(request.url);
  const pagePath = url.searchParams.get("pagePath") || "";
  const q = url.searchParams.get("q") || "";
  const locales = await loadAdminShopLocales(admin).catch(() => []);
  const language =
    url.searchParams.get("language")?.trim() ||
    locales.find((row) => !row.primary)?.locale ||
    locales[0]?.locale ||
    "";
  const image = urlKey ? await getSwitcherImage(session.shop, urlKey) : null;
  const pictures = urlKey
    ? await listPicturesByImageId(session.shop, contentImageId(urlKey))
    : [];
  return json({
    shop: session.shop,
    urlKey,
    pagePath,
    q,
    language,
    image,
    pictures,
    locales: locales.filter((row) => !row.primary),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const payload = JSON.parse(String(form.get("translateImage") || "null"));
  if (!payload) return json({ success: false, errorMsg: "INVALID" });
  return json(
    await translateImageToFiles({
      shop: session.shop,
      admin,
      session,
      imageId: payload.imageId,
      imageUrl: payload.imageUrl,
      targetLanguage: payload.targetLanguage,
      model: payload.model,
      alt: payload.alt,
    }),
  );
};

export default function ThirdPartyImageDetail() {
  const { t } = useTranslation();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const translateFetcher = useFetcher<typeof action>();
  const { shop, urlKey, pagePath, q, language, image, pictures, locales } =
    useLoaderData<typeof loader>();
  const { chars, totalChars } = useSelector((state: any) => state.userConfig);
  const [merchantModel, setMerchantModel] = useState<"standard" | "advance">("standard");
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [busyLang, setBusyLang] = useState<string | null>(null);
  const imageId = contentImageId(urlKey);
  const pictureByLang = useMemo(() => {
    const map = new Map(pictures.map((row) => [row.languageCode, row]));
    return map;
  }, [pictures]);

  useEffect(() => {
    if (!translateFetcher.data || translateFetcher.state !== "idle") return;
    setBusyLang(null);
    if (translateFetcher.data.success) {
      shopify.toast.show(t("Image translated successfully"));
      void fetchLocalQuota().then((quota) => {
        if (!quota?.success) return;
        dispatch(setChars({ chars: quota.response.usedPoints }));
        dispatch(setTotalChars({ totalChars: quota.response.purchasePoints }));
      });
      navigate(".", { replace: true });
    } else if (translateFetcher.data.errorMsg === "额度不够") {
      shopify.toast.show(t("Image translation failed"));
      setCreditsOpen(true);
    } else if (translateFetcher.data.errorMsg === "SCOPE_MISSING") {
      shopify.toast.show(t("imageTranslate.scopeMissing"));
    } else {
      shopify.toast.show(t("Image translation failed"));
    }
  }, [translateFetcher.data, translateFetcher.state]);

  const backToList = () => {
    if (pagePath) navigate(thirdPartyPagePath(pagePath, language, q));
    else navigate(thirdPartyListHref({ language, q: q || undefined }));
  };

  const triggerTranslate = (locale: string) => {
    if (!image) return;
    if (totalChars - chars < merchantImageCredits(merchantModel)) {
      setCreditsOpen(true);
      return;
    }
    setBusyLang(locale);
    translateFetcher.submit(
      {
        translateImage: JSON.stringify({
          targetLanguage: locale,
          imageUrl: image.imageBeforeUrl,
          imageId,
          model: merchantModel,
        }),
      },
      { method: "post" },
    );
  };

  if (!image) {
    return (
      <Page backAction={{ content: t("Third-party images"), onAction: backToList }}>
        <TitleBar title={t("Third-party images")} />
        <Empty description={t("thirdParty.pageEmpty")} />
      </Page>
    );
  }

  return (
    <Page backAction={{ content: t("Third-party images"), onAction: backToList }}>
      <TitleBar title={t("Manage image translations")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Card style={{ marginBottom: 16 }}>
        <Flex gap={16} align="center">
          <Thumbnail source={image.imageBeforeUrl || ImageIcon} alt="" size="large" />
          <div style={{ wordBreak: "break-all" }}>{image.imageBeforeUrl}</div>
        </Flex>
      </Card>
      <div style={{ marginBottom: 16 }}>
        <Radio.Group
          value={merchantModel}
          onChange={(e) => setMerchantModel(e.target.value)}
          options={[
            { label: t("Standard"), value: "standard" },
            { label: t("Advance"), value: "advance" },
          ]}
        />
      </div>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {locales.map((locale) => {
          const pic = pictureByLang.get(locale.locale);
          return (
            <Card key={locale.locale} title={locale.name || locale.locale}>
              <Flex gap={16} align="flex-start" wrap="wrap">
                {pic?.imageAfterUrl ? (
                  <Image src={pic.imageAfterUrl} width={120} />
                ) : (
                  <Thumbnail source={ImageIcon} alt="" size="large" />
                )}
                <Space>
                  <Button
                    loading={busyLang === locale.locale}
                    onClick={() => triggerTranslate(locale.locale)}
                  >
                    {t("Translate")}
                  </Button>
                  <Upload
                    maxCount={1}
                    accept="image/*"
                    showUploadList={false}
                    customRequest={async (options) => {
                      const file = options.file as File;
                      const res = await UploadProductImage({
                        shopName: shop,
                        imageId,
                        imageUrl: image.imageBeforeUrl,
                        languageCode: locale.locale,
                        file,
                      });
                      if (res?.success) {
                        options.onSuccess?.(res);
                        navigate(".", { replace: true });
                      } else {
                        options.onError?.(new Error(res?.errorMsg || "UPLOAD_FAILED"));
                        shopify.toast.show(t("Upload Failed"));
                      }
                    }}
                  >
                    <Button icon={<PlusOutlined />}>{t("Upload")}</Button>
                  </Upload>
                  {pic?.imageAfterUrl ? (
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={async () => {
                        const res = await DeleteProductImageLocal({
                          shopName: shop,
                          imageId,
                          imageUrl: pic.imageBeforeUrl || image.imageBeforeUrl,
                          languageCode: locale.locale,
                        });
                        if (res?.success) navigate(".", { replace: true });
                        else shopify.toast.show(t("Image saving failed"));
                      }}
                    >
                      {t("Clear")}
                    </Button>
                  ) : null}
                </Space>
              </Flex>
            </Card>
          );
        })}
      </Space>
      <AddCreaditsModal
        openModal={creditsOpen}
        onClose={() => setCreditsOpen(false)}
        action="images"
        imageId={urlKey}
      />
    </Page>
  );
}
