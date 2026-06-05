import React, { useEffect } from "react";
import { Form, Input, Switch } from "antd";
import { useI18n } from "../hooks/useI18n";

export default function UploadStepEditor({ config, onChange }) {
  const { t } = useI18n();
  const [form] = Form.useForm();

  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        allowPdSelector: config.allowPdSelector ?? false,
        acceptTypes: config.acceptTypes || "",
      });
    }
  }, [config, form]);

  const handleValuesChange = (_, allValues) => {
    if (onChange) {
      onChange({ ...config, ...allValues });
    }
  };

  return (
    <div className="p-4">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          allowPdSelector: config?.allowPdSelector ?? false,
          acceptTypes: config?.acceptTypes || "",
        }}
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          label={t("uploadStep.allowPdSelector") || "Allow PD Selector"}
          name="allowPdSelector"
          valuePropName="checked"
          help={t("uploadStep.allowPdSelectorHelp") || "Let users manually select PD during upload step"}
        >
          <Switch />
        </Form.Item>

        <Form.Item
          label={t("uploadStep.acceptTypes") || "Accepted File Types"}
          name="acceptTypes"
          help={t("uploadStep.helpAcceptTypes") || "File types customers can upload, e.g. image/png,image/jpeg,application/pdf"}
        >
          <Input placeholder="image/png,image/jpeg,application/pdf" />
        </Form.Item>
      </Form>
    </div>
  );
}