import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Grid,
  InlineStack,
  Layout,
  Page,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import styles from "./styles/styles.module.css";
import { useEffect, useState } from "react";
import CardSkeleton from "app/components/cardSkeleton";
import { GetUserCounter } from "app/api/JavaServer";
import { authenticate } from "app/shopify.server";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";

const options = [
  {
    key: 0,
    label: "500,000",
    value: "500000",
    price: 3.99,
  },
  {
    key: 1,
    label: "1,000,000",
    value: "1000000",
    price: 6.99,
  },
  {
    key: 2,
    label: "2,000,000",
    value: "2000000",
    price: 15.99,
  },
  {
    key: 3,
    label: "3,000,000",
    value: "3000000",
    price: 23.99,
  },
  {
    key: 4,
    label: "5,000,000",
    value: "5000000",
    price: 39.99,
  },
  {
    key: 5,
    label: "10,000,000",
    value: "10000000",
    price: 79.99,
  },
  {
    key: 6,
    label: "20,000,000",
    value: "20000000",
    price: 159.99,
  },
  {
    key: 7,
    label: "30,000,000",
    value: "30000000",
    price: 239.99,
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { session, admin } = adminAuthResult;
  try {
    return {
      shop: session?.shop,
      server: process.env.SERVER_URL,
    };
  } catch (error) {
    console.error(error);
    return {
      shop: "",
      server: process.env.SERVER_URL,
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const adminAuthResult = await authenticate.admin(request);
  const { session, admin } = adminAuthResult;
  const { shop } = session;
  const label = formData.get("label");
  const price = formData.get("price");
  try {
    const returnUrl = new URL(
      `https://admin.shopify.com/store/${shop?.split(".")[0]}/apps/${process.env.HANDLE}/app/pricing`,
    );

    const response = await admin.graphql(
      `#graphql
        mutation AppPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL!, $test: Boolean!) {
          appPurchaseOneTimeCreate(name: $name, returnUrl: $returnUrl, price: $price, test: $test) {
            userErrors {
              field
              message
            }
            appPurchaseOneTime {
              createdAt
              id
            }
            confirmationUrl
          }
        }`,
      {
        variables: {
          name: label + " Credits",
          returnUrl: returnUrl,
          price: {
            amount: price,
            currencyCode: "USD",
          },
          test:
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "test"
              ? true
              : false,
        },
      },
    );

    const responseJson = await response.json();
    return {
      success: true,
      errorCode: null,
      errorMsg: null,
      response: responseJson.data.appPurchaseOneTimeCreate,
    };
  } catch (error) {
    console.error("Error payInfo app:", error);
    return {
      success: false,
      errorCode: "INTERNAL_SERVER_ERROR",
      errorMsg: "Internal server error",
      response: null,
    };
  }
};

const Index = () => {
  const { server, shop } = useLoaderData<typeof loader>();
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [usedCredits, setUsedCredits] = useState<number>(0);
  const [maxCredits, setMaxCredits] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const payFetcher = useFetcher<any>();

  useEffect(() => {
    const handleGetUserCounter = async () => {
      const response = await GetUserCounter({
        server: server as string,
        shop: shop,
      });
      if (response.success) {
        setMaxCredits(response.response?.allToken);
        setUsedCredits(response.response?.userToken);
      }
    };
    handleGetUserCounter();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (payFetcher.data?.success) {
      open(payFetcher.data.response.confirmationUrl, "_top");
    }
  }, [payFetcher.data]);

  const handleOptionSelect = (option: any) => {
    setSelectedOption(option);
  };

  const handlePay = () => {
    payFetcher.submit(
      {
        shop: shop,
        label: selectedOption?.label,
        price: selectedOption?.price,
      },
      {
        method: "POST",
        action: "/app/pricing",
      },
    );
  };

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200">
                <Text variant="headingLg" as="h2">
                  Your Balance
                </Text>
              </InlineStack>
              <InlineStack gap="200">
                <CardSkeleton height="20px" active={loading}>
                  <InlineStack gap="100">
                    <Text variant="bodyMd" as="p" fontWeight="bold">
                      {usedCredits.toLocaleString()}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      has been used, total credits:
                    </Text>
                    <Text variant="bodyMd" as="p" fontWeight="bold">
                      {maxCredits.toLocaleString()}.
                    </Text>
                  </InlineStack>
                </CardSkeleton>
              </InlineStack>
              <ProgressBar
                size="small"
                progress={
                  usedCredits && maxCredits
                    ? (usedCredits / maxCredits) * 100
                    : 0
                }
              />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200">
                <Text variant="headingLg" as="h2">
                  Buy Credits
                </Text>
              </InlineStack>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                  <PricingCard
                    option={options[0]}
                    onSelect={handleOptionSelect}
                    isSelected={selectedOption?.key === options[0].key}
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                  <PricingCard
                    option={options[1]}
                    onSelect={handleOptionSelect}
                    isSelected={selectedOption?.key === options[1].key}
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                  <PricingCard
                    option={options[2]}
                    onSelect={handleOptionSelect}
                    isSelected={selectedOption?.key === options[2].key}
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                  <PricingCard
                    option={options[3]}
                    onSelect={handleOptionSelect}
                    isSelected={selectedOption?.key === options[3].key}
                  />
                </Grid.Cell>
              </Grid>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                  <PricingCard
                    option={options[4]}
                    onSelect={handleOptionSelect}
                    isSelected={selectedOption?.key === options[4].key}
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                  <PricingCard
                    option={options[5]}
                    onSelect={handleOptionSelect}
                    isSelected={selectedOption?.key === options[5].key}
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                  <PricingCard
                    option={options[6]}
                    onSelect={handleOptionSelect}
                    isSelected={selectedOption?.key === options[6].key}
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3 }}>
                  <PricingCard
                    option={options[7]}
                    onSelect={handleOptionSelect}
                    isSelected={selectedOption?.key === options[7].key}
                  />
                </Grid.Cell>
              </Grid>
              <Text variant="bodyMd" as="p" alignment="center">
                Total pay: $
                {selectedOption ? selectedOption.price.toFixed(2) : "0.00"}
              </Text>
              {/* <Space>
              <Button
                size="large"
                onClick={() => setCreditsCalculatorOpen(true)}
              >
                {t("Credits Calculator")}
              </Button> */}
              <InlineStack align="center">
                <ButtonGroup>
                  <Button
                    variant="primary"
                    // size="large"
                    disabled={!selectedOption}
                    loading={payFetcher.state === "submitting"}
                    onClick={handlePay}
                  >
                    Buy now
                  </Button>
                </ButtonGroup>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

const PricingCard = ({
  option,
  onSelect,
  isSelected,
}: {
  option: any;
  onSelect: (option: any) => void;
  isSelected: boolean;
}) => {
  const handleClick = () => {
    onSelect(option);
  };

  return (
    <div
      className={
        styles.Ciwi_Pricing_Card +
        " " +
        (isSelected ? styles.Ciwi_Pricing_Card_Selected : "")
      }
      onClick={handleClick}
    >
      <Box
        paddingBlockStart="600"
        paddingBlockEnd="600"
        // background="bg-surface-secondary"
        borderColor="border"
        borderRadius="200"
        borderWidth="025"
      >
        <BlockStack align="center" inlineAlign="center" gap="400">
          <Text variant="bodyLg" as="p">
            {option.label} Credits
          </Text>
          <Text variant="headingLg" as="p">
            ${option.price}
          </Text>
        </BlockStack>
      </Box>
    </div>
  );
};

export default Index;
