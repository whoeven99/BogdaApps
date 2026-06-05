import React, { useEffect } from "react";
import { Form, Input } from "antd";
import { useI18n } from "../hooks/useI18n";

const { TextArea } = Input;

export default function PageConfigEditor({ content, onChange }) {
  const { t } = useI18n();
  const [form] = Form.useForm();

  useEffect(() => {
    if (content) {
      form.setFieldsValue({
        title: content.title || "",
        subtitle: content.subtitle || "",
        description: content.description || "",
      });
    }
  }, [content, form]);

  const handleValuesChange = (_, allValues) => {
    if (onChange) {
      onChange({ ...content, ...allValues });
    }
  };

  return (
    <div className="p-4">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          title: content?.title || "",
          subtitle: content?.subtitle || "",
          description: content?.description || "",
        }}
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          label={t("pageConfig.title") || "Title"}
          name="title"
          help={t("pageConfig.helpTitle") || "The heading displayed at the top of this step."}
        >
          <Input placeholder={t("pageConfig.titlePlaceholder") || "Enter page title"} />
        </Form.Item>

        <Form.Item
          label={t("pageConfig.subtitle") || "Subtitle"}
          name="subtitle"
          help={t("pageConfig.helpSubtitle") || "A secondary heading shown below the title."}
        >
          <Input placeholder={t("pageConfig.subtitlePlaceholder") || "Enter page subtitle"} />
        </Form.Item>

        <Form.Item
          label={t("pageConfig.description") || "Description"}
          name="description"
          help={t("pageConfig.helpDescription") || "Additional context or instruction text for the customer."}
        >
          <TextArea
            rows={4}
            placeholder={t("pageConfig.descriptionPlaceholder") || "Enter page description"}
          />
        </Form.Item>
      </Form>
    </div>
  );
}