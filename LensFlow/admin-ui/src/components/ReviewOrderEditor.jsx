import React, { useEffect } from "react";
import { Form, Switch, Alert } from "antd";
import { useI18n } from "../hooks/useI18n";

export default function ReviewOrderEditor({ config, onChange }) {
  const { t } = useI18n();
  const [form] = Form.useForm();

  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        showFrameInfo: config.showFrameInfo ?? true,
        showLensInfo: config.showLensInfo ?? true,
        showPrescriptionInfo: config.showPrescriptionInfo ?? true,
        showAddToCart: config.showAddToCart ?? true,
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
      <Alert type="info" message={t("reviewOrder.intro") || "The Order Review step shows a summary of the customer's selections before adding to cart."} showIcon closable style={{ marginBottom: 12 }} />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          showFrameInfo: config?.showFrameInfo ?? true,
          showLensInfo: config?.showLensInfo ?? true,
          showPrescriptionInfo: config?.showPrescriptionInfo ?? true,
          showAddToCart: config?.showAddToCart ?? true,
        }}
        onValuesChange={handleValuesChange}
      >
        <div className="space-y-3">
          <Form.Item
            label={t("reviewOrder.showFrameInfo") || "Show Frame Information"}
            name="showFrameInfo"
            valuePropName="checked"
            className="mb-2"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label={t("reviewOrder.showLensInfo") || "Show Lens Information"}
            name="showLensInfo"
            valuePropName="checked"
            className="mb-2"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label={t("reviewOrder.showPrescriptionInfo") || "Show Prescription Information"}
            name="showPrescriptionInfo"
            valuePropName="checked"
            className="mb-2"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label={t("reviewOrder.showAddToCart") || "Show Add to Cart Button"}
            name="showAddToCart"
            valuePropName="checked"
            className="mb-2"
          >
            <Switch />
          </Form.Item>
        </div>
      </Form>
    </div>
  );
}