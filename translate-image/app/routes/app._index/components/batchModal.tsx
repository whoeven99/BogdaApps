import { Modal, Checkbox, Input, Button, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const { Title } = Typography;

interface ImageTranslateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

export default function ImageTranslateModal({
  open,
  onClose,
  onSubmit,
}: ImageTranslateModalProps) {
  const { languageList } = useSelector((state: any) => state.language);
  // console.log("languageList", languageList);

  const [modules, setModules] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [model, setModel] = useState("Gemin 3 Pro");
  const [languageOptions, setLanguageOptions] = useState<
    { label: string; value: string }[]
  >(
    languageList.map((lang: any) => {
      return { label: lang.name, value: lang.locale };
    }),
  );
  const handleSubmit = () => {
    const payload = {
      modules,
      languages,
      model,
    };
    onSubmit?.(payload);
  };
  useEffect(() => {
    setLanguageOptions(
      languageList.map((lang: any) => {
        return { label: lang.name, value: lang.locale };
      }),
    );
  }, []);
  return (
    <Modal
      open={open}
      title="图片翻译设置"
      onCancel={onClose}
      footer={null}
      width={520}
      centered
    >
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        {/* 翻译模块 */}
        <div>
          <Title level={5}>翻译模块</Title>
          <Checkbox.Group
            options={[
              { label: "产品", value: "product" },
              { label: "主题", value: "theme" },
              { label: "文章", value: "article" },
            ]}
            value={modules}
            onChange={(val) => setModules(val as string[])}
          />
        </div>

        {/* 翻译语言 */}
        <div>
          <Title level={5}>翻译语言</Title>
          <Checkbox.Group
            options={languageOptions}
            value={languages}
            onChange={(val) => setLanguages(val as string[])}
          />
        </div>

        {/* 翻译模型 */}
        <div>
          <Title level={5}>翻译模型</Title>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{ width: 240 }}
          />
        </div>

        {/* 操作按钮 */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Button type="primary" onClick={handleSubmit}>
            翻译
          </Button>
        </div>
      </Space>
    </Modal>
  );
}
