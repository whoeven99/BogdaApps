import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  Tag,
  Spin,
  Divider,
} from "antd";
import "antd/dist/reset.css";
import { useFetcher } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";

const { Title } = Typography;

const ImageTranslation = () => {
  const navigate = useNavigate();
  const languageFetcher = useFetcher<any>();
  const [languageData, setLanguageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载语言数据
  useEffect(() => {
    const formData = new FormData();
    formData.append("languageLoading", JSON.stringify({}));
    languageFetcher.submit(formData, {
      method: "POST",
      action: "/app/management",
    });
  }, []);

  // 监听返回数据
  useEffect(() => {
    if (languageFetcher.data?.response) {
      setLanguageData(languageFetcher.data.response);
      setLoading(false);
    }
  }, [languageFetcher.data]);

  // 模拟翻译进度
  const randomProgress = () => {
    const done = Math.floor(Math.random() * 100);
    const total = done + Math.floor(Math.random() * 20) + 1;
    return `${done}/${total}`;
  };

  // 表格列定义
  const columns = [
    {
      title: "语言名称",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: any) => (
        <Space>
          {/* <Tag color={record.primary ? "green" : "blue"}>{record.locale}</Tag> */}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: "发布状态",
      dataIndex: "published",
      key: "published",
      render: (published: boolean) =>
        published ? (
          <Tag color="green">已发布</Tag>
        ) : (
          <Tag color="red">未发布</Tag>
        ),
      align: "center" as const,
      width: 120,
    },
    {
      title: "翻译进度",
      key: "progress",
      render: () => <span>{randomProgress()}</span>,
      align: "center" as const,
      width: 120,
    },
    {
      title: "操作",
      key: "operations",
      align: "center" as const,
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small">
            查看
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={() => {
              navigate(`/app/management?language=${record.locale}`);
            }}
          >
            翻译
          </Button>
        </Space>
      ),
    },
  ];

  // 自定义表格样式
  const tableStyle = {
    background: "#fff",
    border: "1px solid #f0f0f0",
    borderRadius: "8px",
    overflow: "hidden",
  };

  return (
    <Spin spinning={loading} tip="加载语言数据中...">
      <Space style={{ width: "100%" }} direction="vertical" size="large">
        <Card>
          <Title level={4}>图片翻译</Title>
          <Divider style={{ margin: "8px 0" }} />
          <Table
            dataSource={languageData}
            columns={columns}
            rowKey="locale"
            pagination={false}
            bordered={false}
            style={tableStyle}
          />
        </Card>

        <Card>
          <Title level={4}>Alt Text 翻译</Title>
          <Divider style={{ margin: "8px 0" }} />
          <Table
            dataSource={languageData}
            columns={columns}
            rowKey="locale"
            pagination={false}
            bordered={false}
            style={tableStyle}
          />
        </Card>
      </Space>
    </Spin>
  );
};

export default ImageTranslation;
