import React, { useState } from "react";
import { Tag, Button, Modal, Checkbox, Alert, Space, Typography, Descriptions } from "antd";
import { SendOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";

const { Text, Title } = Typography;

export default function PublishTab({ flow, onPublish, saving }) {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  const isPublished = flow?.status === "published";
  const isFirstPublish = !isPublished;

  const allChecked = check1 && check2 && check3;

  const handlePublishClick = () => {
    if (isFirstPublish) {
      setModalOpen(true);
    } else {
      if (onPublish) onPublish();
    }
  };

  const handleConfirmPublish = () => {
    if (!allChecked) return;
    setModalOpen(false);
    if (onPublish) onPublish();
  };

  const resetChecks = () => {
    setCheck1(false);
    setCheck2(false);
    setCheck3(false);
  };

  return (
    <div className="p-4">
      <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label={t("publish.flowName") || "Flow Name"}>
          <Text strong>{flow?.name || "-"}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("publish.status") || "Status"}>
          <Tag color={isPublished ? "green" : "gold"}>{isPublished ? (t("publish.published") || "Published") : (t("publish.draft") || "Draft")}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("publish.flowKey") || "Flow Key"}>
          <Text code>{flow?.config?.settings?.flowKey || "-"}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("publish.productsAssigned") || "Products Assigned"}>
          <Text>{(flow?.productIds || []).length}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("publish.lastUpdated") || "Last Updated"}>
          <Text>{flow?.updatedAt ? new Date(flow.updatedAt).toLocaleString() : "-"}</Text>
        </Descriptions.Item>
      </Descriptions>

      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {isPublished && (
          <Alert
            type="success"
            showIcon
            message={t("publish.liveMessage") || "This flow is live"}
            description={t("publish.liveDesc") || "Changes will take effect on your storefront after republishing."}
          />
        )}

        {!isPublished && (
          <Alert
            type="warning"
            showIcon
            message={t("publish.draftMessage") || "This flow is still in draft"}
            description={t("publish.draftDesc") || "Publish it to make it available on your storefront."}
          />
        )}

        <Button
          type="primary"
          size="large"
          icon={<SendOutlined />}
          onClick={handlePublishClick}
          loading={saving}
          block
        >
          {isPublished ? (t("publish.republishBtn") || "Republish Flow") : (t("publish.publishBtn") || "Publish Flow")}
        </Button>
      </Space>

      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: "#faad14" }} />
            <span>{t("publish.beforePublish") || "Before You Publish"}</span>
          </Space>
        }
        open={modalOpen}
        onOk={handleConfirmPublish}
        onCancel={() => { setModalOpen(false); resetChecks(); }}
        okText={t("publish.okText") || "Publish"}
        okButtonProps={{ disabled: !allChecked }}
        destroyOnClose
        width={520}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>{t("publish.instructions") || "Please confirm the following items are completed before publishing for the first time:"}</Text>
        </div>

        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Checkbox checked={check1} onChange={(e) => setCheck1(e.target.checked)}>
            {t("publish.check1") || "I have configured the theme app extension"}
          </Checkbox>
          <Checkbox checked={check2} onChange={(e) => setCheck2(e.target.checked)}>
            {t("publish.check2") || "I have added this flow to at least one product"}
          </Checkbox>
          <Checkbox checked={check3} onChange={(e) => setCheck3(e.target.checked)}>
            {t("publish.check3") || "I have tested the flow on my storefront"}
          </Checkbox>
        </Space>

        <Alert
          type="warning"
          showIcon
          message={t("publish.nonTheme2") || "Non-2.0 Theme Warning"}
          description={t("publish.nonTheme2Desc") || "If your theme is not an Online Store 2.0 theme, app blocks may not be supported. You may need to manually add the app embed via the theme editor."}
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
}
