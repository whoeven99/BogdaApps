import {
  BlockStack,
  Box,
  Button,
  Card,
  Grid,
  InlineStack,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import { useFetcher, useNavigate } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
interface DetailProgressProps {
  total: number;
  unfinished: number;
  moduleName: string;
  itemStatus: number;
  status: number;
  progress: number;
  handleStop: () => void;
  loading: boolean;
  updateTime: string;
}

const DetailProgress: React.FC<DetailProgressProps> = ({
  total,
  unfinished,
  moduleName,
  itemStatus,
  status,
  progress,
  handleStop,
  loading,
  updateTime,
}) => {
  const navigate = useNavigate();

  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);

  const tipIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const tipTexts = useMemo(() => [".", "..", "..."], []);

  const itemStatusTexts = useMemo(
    () => [
      "Fetching product data",
      "Generating content with AI",
      "Saving results to store",
    ],
    [],
  );

  const updateTimeText = useMemo(() => {
    if (updateTime) {
      const newUpdateTime = new Date(updateTime);
      return `(${newUpdateTime.toLocaleString()})`;
    }
    return "";
  }, [updateTime]);

  useEffect(() => {
    return () => {
      if (tipIntervalRef.current) {
        clearInterval(tipIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === 2) {
      startTipTimer();
    } else {
      stopTipTimer();
    }
  }, [status]);

  const startTipTimer = useCallback(() => {
    setCurrentTipIndex(0);
    tipIntervalRef.current = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tipTexts.length);
    }, 2000);
  }, [tipTexts.length]);

  const stopTipTimer = useCallback(() => {
    if (tipIntervalRef.current) {
      clearInterval(tipIntervalRef.current);
      tipIntervalRef.current = null;
    }
    setCurrentTipIndex(0);
  }, []);

  const pendingDoc = (
    <div>
      <InlineStack gap="200">
        <Text as="h2" fontWeight="bold">
          Progress Details:
        </Text>{" "}
        <Text as="h2">
          {itemStatusTexts[itemStatus] + tipTexts[currentTipIndex]}
        </Text>
      </InlineStack>
      <InlineStack gap="200">
        <Text as="h2" fontWeight="bold">
          Completed:
        </Text>{" "}
        <Text as="h2">
          {total - unfinished < 0 ? 0 : total - unfinished}/{total}
        </Text>
      </InlineStack>
    </div>
  );

  const finishedDoc = (
    <div>
      <Text as="h2">{moduleName} creation task has been completed</Text>
      <InlineStack gap="200">
        <Text as="h2" fontWeight="bold">
          Completed:
        </Text>{" "}
        <Text as="h2">
          {total - unfinished < 0 ? 0 : total - unfinished}/{total}
        </Text>
      </InlineStack>
    </div>
  );

  const failedDoc = (
    <div>
      <Text as="h2">Abnormal error, stopped creating {moduleName} module</Text>
      <InlineStack gap="200">
        <Text as="h2" fontWeight="bold">
          Completed:
        </Text>{" "}
        <Text as="h2">
          {total - unfinished < 0 ? 0 : total - unfinished}/{total}
        </Text>
      </InlineStack>
    </div>
  );

  const tokenExhaustedDoc = (
    <div>
      <Text as="h2">
        Insufficient credit, stopped creating {moduleName} module
      </Text>
      <InlineStack gap="200">
        <Text as="h2" fontWeight="bold">
          Completed:
        </Text>{" "}
        <Text as="h2">
          {total - unfinished < 0 ? 0 : total - unfinished}/{total}
        </Text>
      </InlineStack>
    </div>
  );

  return (
    !!status && (
      <Card>
        <Box
          paddingBlockStart={"400"}
          paddingBlockEnd={"400"}
          paddingInlineStart={"200"}
          paddingInlineEnd={"200"}
        >
          <Grid columns={{ sm: 3 }}>
            <Grid.Cell columnSpan={{ xs: 4, sm: 2, md: 2, lg: 10, xl: 10 }}>
              <BlockStack gap="200">
                <InlineStack gap="200">
                  <Text as="h2" variant="headingMd" fontWeight="bold">
                    Task Progress
                  </Text>
                  <Text as="h2" variant="headingMd">
                    {updateTimeText}
                  </Text>
                </InlineStack>
                {status === 1 && finishedDoc}
                {status === 2 && pendingDoc}
                {(status === 3 || status === 6) && tokenExhaustedDoc}
                {(status === 4 || status === 5) && failedDoc}
                <Text as="h2">{""}</Text>
                <div style={{ width: "100%" }}>
                  <ProgressBar
                    progress={progress < 0 ? 0 : status === 1 ? 100 : progress}
                    size="small"
                  />
                </div>
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell
              columnSpan={{
                xs: 2,
                sm: 1,
                md: 1,
                lg: 2,
                xl: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "end",
                  height: "100%",
                }}
              >
                {status === 1 && (
                  <Button
                    onClick={() => {
                      navigate("/app/resultManage");
                    }}
                  >
                    Check content
                  </Button>
                )}
                {status === 2 && (
                  <Button onClick={handleStop} loading={loading}>
                    Stop
                  </Button>
                )}
                {(status === 3 || status === 6) && (
                  <BlockStack gap="200">
                    <Button
                      onClick={() => {
                        navigate("/app/pricing");
                      }}
                    >
                      Purchase amount
                    </Button>
                    {/* <Button
                    variant="primary"
                    onClick={() => {
                    }}
                  >
                    Continue to create
                  </Button> */}
                  </BlockStack>
                )}
                {(status === 4 || status === 5) && (
                  <Button onClick={handleContactSupport}>
                    Contact the Team
                  </Button>
                )}
              </div>
            </Grid.Cell>
          </Grid>
        </Box>
      </Card>
    )
  );
};

export const handleContactSupport = () => {
  // 声明 tidioChatApi 类型
  interface Window {
    tidioChatApi?: {
      open: () => void;
    };
  }

  if ((window as Window)?.tidioChatApi) {
    (window as Window).tidioChatApi?.open();
  } else {
    console.warn("Tidio Chat API not loaded");
  }
};

export default DetailProgress;
