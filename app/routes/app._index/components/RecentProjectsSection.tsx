import {
  Card,
  BlockStack,
  Text,
  Thumbnail,
  InlineStack,
  Button,
} from "@shopify/polaris";

import { RecentProjects } from "../route";

export default function RecentProjectsSection({
  projects,
}: {
  projects: RecentProjects;
}) {
  return projects.success ? (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "10px",
      }}
    >
      {projects.data.map((project: any) => (
        <div
          key={project.id}
          style={{
            border: "1px solid #d9d9d9",
            padding: "5px",
            background: "#fff",
            textAlign: "center",
          }}
        >
          <img
            src={project.url}
            alt={project.title}
            style={{
              width: 160,
              height: 160,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
          <Text variant="bodyMd" as="p">
            {project.title}
          </Text>
        </div>
      ))}
    </div>
  ) : (
    <div>No recent projects found.</div>
  );
}
