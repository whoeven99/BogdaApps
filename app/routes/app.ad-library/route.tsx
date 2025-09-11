import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Select,
  Thumbnail,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import { Upload, Skeleton } from "antd";
import type { RcFile, UploadProps } from "antd/es/upload/interface";
import { Input, Pagination } from "antd";
import { useTranslation } from "react-i18next";
import { getAdTemplates } from "app/api/javaServer";
import { json } from "@remix-run/node";
import styles from "./style.module.css";


export default function AdLibrary() {

  return (
    <Page title="Ad Library" fullWidth>
      <TitleBar title="Ad Library" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Creative Studio
              </Text>
              <Text variant="bodyMd" as="p">
                See how your product image pairs with ad templates to create
                custom ads. Book a free 1:1 call to explore Creative Studio.
              </Text>
              <InlineStack gap="200">
                <Button>+650</Button>
                <Button variant="tertiary">Generate image ads</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
