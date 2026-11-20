import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  InlineStack,
  Text,
} from "@shopify/polaris";
import styles from "./styles.module.css";
import { useState } from "react";

interface TemplateCardProps {
  id: string;
  title: string;
  description: string;
  content: string;
  loading: boolean;
  added: boolean;
  isSystem: boolean;
  type: string;
  onClick: () => void;
  handleAdd: () => void;
  handleDelete: () => void;
}

const TemplateCard = ({
  id,
  title,
  description,
  content,
  loading,
  added,
  isSystem,
  type,
  onClick,
  handleAdd,
  handleDelete,
}: TemplateCardProps) => {
  return (
    <Box
      borderColor="border"
      borderRadius="200"
      borderWidth="050"
      minHeight="380px"
      borderStyle="solid"
    >
      <div className={styles.Ciwi_template_card_content}>
        <div className={styles.Ciwi_template_card_content_markdown}>
          <Text as="p" variant="bodyMd">
            {content}
          </Text>
        </div>
        <div className={styles.Ciwi_template_card_content_name}>
          {type && <Badge>{type}</Badge>}
          <Text as="h2" variant="headingMd">
            {title}
          </Text>
          <Text as="span" variant="bodySm">
            {description}
          </Text>
          <Box width="100%">
            <InlineStack
              align={type ? "space-between" : "end"}
              wrap={false}
              direction="row"
            >
              {isSystem ? (
                <>
                  <Button onClick={onClick}>Preview</Button>
                  {added ? (
                    <Button
                      variant="monochromePlain"
                      onClick={handleDelete}
                      loading={loading}
                    >
                      Added
                    </Button>
                  ) : (
                    <Button onClick={handleAdd} loading={loading}>
                      Add
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {type && <Button onClick={onClick}>Preview</Button>}
                  <Button
                    variant="monochromePlain"
                    onClick={handleDelete}
                    loading={loading}
                  >
                    Delete
                  </Button>
                </>
              )}
            </InlineStack>
          </Box>
        </div>
      </div>
    </Box>
  );
};

export default TemplateCard;
