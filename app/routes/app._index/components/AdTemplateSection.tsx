import {
  Card,
  BlockStack,
  Text,
  Thumbnail,
  InlineStack,
  Button,
} from "@shopify/polaris";

interface AdTemplate {
  id: number;
  url: string;
  title: string;
}

interface AdTemplateSectionProps {
  templates: AdTemplate[];
}

export default function AdTemplateSection({
  templates,
}: AdTemplateSectionProps) {
  return (
    <Card>
      <BlockStack gap="500">
        <InlineStack align="space-between">
          <Text as="h2" variant="headingMd">
            Top ad ideas for you
          </Text>
          <Button variant="plain">View all</Button>
        </InlineStack>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
          }}
        >
          {templates.map((template) => (
            <div
              key={template.id}
              style={{
                border: "1px solid #d9d9d9",
                padding: "5px",
                background: "#fff",
                textAlign: "center",
              }}
            >
              <img
                src={template.url}
                alt={template.title}
                style={{
                  width: 160,
                  height: 160,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
              <Text variant="bodyMd" as="p">
                {template.title}
              </Text>
            </div>
          ))}
        </div>
      </BlockStack>
    </Card>
  );
}
