import { Card, BlockStack, Text, Thumbnail, InlineStack, Button } from "@shopify/polaris";

interface RecentProject {
    id: number;
    url: string;
    title: string;
}

interface RecentProjectsSectionProps {
    projects: RecentProject[];
}

export default function RecentProjectsSection({ projects }: RecentProjectsSectionProps) {
    if (projects.length>0) {
        console.log(projects);
    }
    return (
        <Card>
            <BlockStack gap="500">
                <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">Recent projects</Text>
                    <Button variant="plain">View all</Button>
                </InlineStack>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            style={{
                                border: "1px solid #d9d9d9",
                                padding: "5px",
                                background: "#fff",
                                textAlign: "center",
                            }}
                        >
                            <Thumbnail source={project.url} alt={project.title} size="large" />
                            <Text variant="bodyMd" as="p">{project.title}</Text>
                        </div>
                    ))}
                </div>
            </BlockStack>
        </Card>
    );
}