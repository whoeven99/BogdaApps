import {
  Card,
  BlockStack,
  Text,
  Thumbnail,
  InlineStack,
  Button,
} from "@shopify/polaris";

import { AdTemplates } from "../route";

export default function AdTemplateSection({
  templates,
}: {
  templates: AdTemplates;
}) {
  return templates.success ? (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "10px",
      }}
    >
      {templates.data.map((template: any) => (
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
  ) : (
    <div>No ad templates found.</div>
  );
}
