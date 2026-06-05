import React, { useEffect } from "react";
import { Form, Select, Switch, Collapse, Typography } from "antd";
import { useI18n } from "../hooks/useI18n";

const { Panel } = Collapse;
const { Text } = Typography;

function buildRange(from, to, step) {
  const arr = [];
  for (let v = from; v <= to + 0.0001; v += step) {
    arr.push(Math.round(v * 10000) / 10000);
  }
  return arr;
}

function fmtSphCyl(v) {
  const s = v.toFixed(2);
  return v > 0 ? "+" + s : String(v);
}

function fmtAxis(v) { return v + "°"; }
function fmtAdd(v) { return "+" + v.toFixed(2); }
function fmtPd(v) { return v.toFixed(1); }

const SPH_RANGE = buildRange(-20, 20, 0.25);
const CYL_RANGE = buildRange(-6, 0, 0.25);
const AXIS_RANGE = buildRange(0, 180, 1);
const ADD_RANGE = buildRange(0, 4, 0.25);
const PD_RANGE = buildRange(45, 85, 0.5);

const fieldConfigs = [
  {
    key: "sph",
    minOptions: SPH_RANGE,
    maxOptions: SPH_RANGE,
    formatFn: fmtSphCyl,
    stepOptions: [0.25],
    defaultMin: -20,
    defaultMax: 20,
    defaultStep: 0.25,
    defaultRequired: true,
  },
  {
    key: "cyl",
    minOptions: CYL_RANGE,
    maxOptions: buildRange(0, 6, 0.25),
    formatFn: fmtSphCyl,
    stepOptions: [0.25],
    defaultMin: -6,
    defaultMax: 0,
    defaultStep: 0.25,
    defaultRequired: true,
  },
  {
    key: "axis",
    minOptions: AXIS_RANGE,
    maxOptions: AXIS_RANGE,
    formatFn: fmtAxis,
    stepOptions: [1, 5, 10],
    defaultMin: 0,
    defaultMax: 180,
    defaultStep: 1,
    defaultRequired: true,
  },
  {
    key: "add",
    minOptions: ADD_RANGE,
    maxOptions: ADD_RANGE,
    formatFn: fmtAdd,
    stepOptions: [0.25],
    defaultMin: 0,
    defaultMax: 4,
    defaultStep: 0.25,
    defaultRequired: false,
  },
  {
    key: "pd",
    minOptions: PD_RANGE,
    maxOptions: PD_RANGE,
    formatFn: fmtPd,
    stepOptions: [0.5, 1.0, 2.0],
    defaultMin: 45,
    defaultMax: 85,
    defaultStep: 0.5,
    defaultRequired: true,
  },
];

function getHelpKey(key) {
  const map = { sph: "helpSPH", cyl: "helpCYL", axis: "helpAXIS", add: "helpADD", pd: "helpPD" };
  return "prescriptionForm." + (map[key] || key);
}

export default function PrescriptionFormEditor({ config, onChange }) {
  const { t } = useI18n();
  const [form] = Form.useForm();

  useEffect(() => {
    if (config) {
      const values = {};
      fieldConfigs.forEach((fc) => {
        values[fc.key + "_min"] = config[fc.key]?.min ?? fc.defaultMin;
        values[fc.key + "_max"] = config[fc.key]?.max ?? fc.defaultMax;
        values[fc.key + "_step"] = config[fc.key]?.step ?? fc.defaultStep;
        values[fc.key + "_required"] = config[fc.key]?.required ?? fc.defaultRequired;
      });
      values.showPrism = config.showPrism ?? false;
      values.showOcHt = config.showOcHt ?? false;
      form.setFieldsValue(values);
    }
  }, [config, form]);

  const handleValuesChange = (_, allValues) => {
    if (!onChange) return;
    const next = {};
    fieldConfigs.forEach((fc) => {
      next[fc.key] = {
        min: allValues[fc.key + "_min"] ?? fc.defaultMin,
        max: allValues[fc.key + "_max"] ?? fc.defaultMax,
        step: allValues[fc.key + "_step"] ?? fc.defaultStep,
        required: allValues[fc.key + "_required"] ?? fc.defaultRequired,
      };
    });
    next.showPrism = allValues.showPrism;
    next.showOcHt = allValues.showOcHt;
    onChange(next);
  };

  const initialValues = {};
  fieldConfigs.forEach((fc) => {
    initialValues[fc.key + "_min"] = config?.[fc.key]?.min ?? fc.defaultMin;
    initialValues[fc.key + "_max"] = config?.[fc.key]?.max ?? fc.defaultMax;
    initialValues[fc.key + "_step"] = config?.[fc.key]?.step ?? fc.defaultStep;
    initialValues[fc.key + "_required"] = config?.[fc.key]?.required ?? fc.defaultRequired;
  });
  initialValues.showPrism = config?.showPrism ?? false;
  initialValues.showOcHt = config?.showOcHt ?? false;

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
      >
        {fieldConfigs.map((fc) => (
          <div key={fc.key} style={{
            marginBottom: 20,
            padding: "14px 16px",
            background: "#fafafa",
            borderRadius: 8,
            border: "1px solid #eee",
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "#333" }}>
              {t("prescriptionForm." + fc.key) || fc.key.toUpperCase()}
              {fc.key !== "add" && (
                <Text type="danger" style={{ fontSize: 12, marginLeft: 4 }}>*</Text>
              )}
            </div>
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 10 }}>
              {t(getHelpKey(fc.key)) || ""}
            </Text>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <Form.Item
                label={<span style={{ fontSize: 12 }}>{t("prescriptionForm.min") || "Min"}</span>}
                name={fc.key + "_min"}
                style={{ marginBottom: 0, minWidth: 100 }}
              >
                <Select
                  showSearch
                  size="small"
                  style={{ width: 100 }}
                  optionFilterProp="label"
                  options={fc.minOptions.map((v) => ({ value: v, label: fc.formatFn(v) }))}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: 12 }}>{t("prescriptionForm.max") || "Max"}</span>}
                name={fc.key + "_max"}
                style={{ marginBottom: 0, minWidth: 100 }}
              >
                <Select
                  showSearch
                  size="small"
                  style={{ width: 100 }}
                  optionFilterProp="label"
                  options={fc.maxOptions.map((v) => ({ value: v, label: fc.formatFn(v) }))}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: 12 }}>{t("prescriptionForm.step") || "Step"}</span>}
                name={fc.key + "_step"}
                style={{ marginBottom: 0, minWidth: 90 }}
              >
                <Select
                  size="small"
                  style={{ width: 90 }}
                  options={fc.stepOptions.map((v) => ({ value: v, label: v }))}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: 12 }}>{t("prescriptionForm.required") || "Required"}</span>}
                name={fc.key + "_required"}
                valuePropName="checked"
                style={{ marginBottom: 0, marginTop: 2 }}
              >
                <Switch size="small" disabled={fc.key !== "add"} />
              </Form.Item>
            </div>
          </div>
        ))}

        <Collapse
          ghost
          items={[
            {
              key: "advanced",
              label: <span style={{ fontSize: 13, fontWeight: 500 }}>{t("prescriptionForm.advancedSettings") || "Advanced Settings"}</span>,
              children: (
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13 }}>{t("prescriptionForm.showPrism") || "Show Prism"}</span>
                    <Form.Item name="showPrism" valuePropName="checked" noStyle>
                      <Switch size="small" />
                    </Form.Item>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13 }}>{t("prescriptionForm.showOcHt") || "Show OC Height"}</span>
                    <Form.Item name="showOcHt" valuePropName="checked" noStyle>
                      <Switch size="small" />
                    </Form.Item>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Form>
    </div>
  );
}
