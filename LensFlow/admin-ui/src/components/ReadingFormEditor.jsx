import React, { useEffect } from "react";
import { Form, Select, Typography } from "antd";
import { useI18n } from "../hooks/useI18n";

const { Text } = Typography;

const MAGNIFICATION_OPTIONS = [+1.00, +1.25, +1.50, +1.75, +2.00, +2.25, +2.50, +2.75, +3.00, +3.25, +3.50, +3.75, +4.00];
const STEP_OPTIONS = [0.25, 0.50];

export default function ReadingFormEditor({ config, onChange }) {
  const { t } = useI18n();
  const [form] = Form.useForm();

  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        maxMagnification: config.maxMagnification ?? 3,
        step: config.step ?? 0.25,
      });
    }
  }, [config, form]);

  const handleValuesChange = (_, allValues) => {
    if (onChange) {
      onChange({ ...config, ...allValues });
    }
  };

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          maxMagnification: config?.maxMagnification ?? 3,
          step: config?.step ?? 0.25,
        }}
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          label={t("readingForm.maxMagnification") || "Max Magnification"}
          name="maxMagnification"
          help={t("readingForm.maxMagnificationHelp") || "Maximum allowed magnification value"}
        >
          <Select
            style={{ width: 160 }}
            options={MAGNIFICATION_OPTIONS.map((v) => ({ value: v, label: "+" + v }))}
          />
        </Form.Item>

        <Form.Item
          label={t("readingForm.step") || "Step"}
          name="step"
          help={t("readingForm.stepHelp") || "Increment step for magnification values"}
        >
          <Select
            style={{ width: 120 }}
            options={STEP_OPTIONS.map((v) => ({ value: v, label: String(v) }))}
          />
        </Form.Item>
      </Form>
    </div>
  );
}
