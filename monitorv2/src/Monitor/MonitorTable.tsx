import React, { useEffect, useState } from 'react';
import { Table, Button, Tag } from 'antd';
import {httpGet} from "../utils/HttpUtils";

const MonitorTable: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await httpGet(process.env.NODE_ENV, '/monitorv2?includeFinish=false');
      const formattedData = Object.entries(response).map(([key, value]: [string, any]) => {
        const initTime = value.initEndTime && value.initStartTime ? value.initEndTime - value.initStartTime : null;
        const transTime = value.translateEndTime && value.initEndTime ? value.translateEndTime - value.initEndTime : null;
        const saveTime = value.savingShopifyEndTime && value.translateEndTime ? value.savingShopifyEndTime - value.translateEndTime : null;
        const lastUpdatedTime = value.savingShopifyEndTime ? Date.now() - value.savingShopifyEndTime : null;

        const shopName = value.shopName.replace(/\.myshopify\.com$/, '');

        return {
          key: key,
          taskId: `${key.split('-')[0]} - ${value.source} -> ${value.target}\n${shopName}`,
          totalCount: value.totalCount,
          translatedCount: value.translatedCount,
          savedCount: value.savedCount,
          usedToken: value.usedToken,
          translatedChars: value.translatedChars,
          initTime: initTime !== null ? formatTime(initTime) : null,
          transTime: transTime !== null ? formatTime(transTime) : null,
          saveTime: saveTime !== null ? formatTime(saveTime) : null,
          lastUpdatedTime: lastUpdatedTime !== null ? formatTime(lastUpdatedTime) : null,
          status: value.status,
          sendEmail: value.send_email == 1
        };
      });
      setData(formattedData);
      setError(null);
    } catch (err) {
        console.log(err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusTag = (status: string | number) => {
    const statusMap: Record<number, string> = {
      0: "用户刚创建任务，读取shopify数据中",
      1: "读取shopify数据，存数据库结束，翻译中",
      2: "翻译结束，写入中",
      3: "写入shopify结束，待发送邮件，完成任务",
      4: "全部完成",
      5: "手动中断 or tokenLimit中断"
    };

    if (typeof status === "number" && statusMap[status]) {
      return <Tag color="blue">{statusMap[status]}</Tag>;
    }

    if (!status) return <Tag color="default">Unknown</Tag>;
    const lowerStatus = status.toString().toLowerCase();
    if (lowerStatus.includes("finish") || lowerStatus.includes("success") || lowerStatus.includes("done")) return <Tag color="green">{status}</Tag>;
    if (lowerStatus.includes("error") || lowerStatus.includes("fail")) return <Tag color="red">{status}</Tag>;
    if (lowerStatus.includes("process") || lowerStatus.includes("running")) return <Tag color="blue">{status}</Tag>;
    return <Tag color="orange">{"任务异常"}</Tag>;
  };

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'taskId',
      key: 'taskId',
    },
    {
      title: '总翻译数',
      dataIndex: 'totalCount',
      key: 'totalCount',
    },
    {
      title: '已翻译数',
      dataIndex: 'translatedCount',
      key: 'translatedCount',
    },
    {
      title: '写入数',
      dataIndex: 'savedCount',
      key: 'savedCount',
    },
    {
      title: '花费积分',
      dataIndex: 'usedToken',
      key: 'usedToken',
    },
    {
      title: '翻译长度',
      dataIndex: 'translatedChars',
      key: 'translatedChars',
    },
    {
      title: '初始化时间',
      dataIndex: 'initTime',
      key: 'initTime',
      render: (text: string) => text || '-',
    },
    {
      title: '翻译时间',
      dataIndex: 'transTime',
      key: 'transTime',
      render: (text: string) => text || '-',
    },
    {
      title: '保存时间',
      dataIndex: 'saveTime',
      key: 'saveTime',
      render: (text: string) => text || '-',
    },
    {
      title: '上次更新',
      dataIndex: 'lastUpdatedTime',
      key: 'lastUpdatedTime',
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '邮件',
      dataIndex: 'sendEmail',
      key: 'sendEmail',
      render: (sendEmail: boolean) => (
        sendEmail ? <Tag color="green">✔</Tag> : <Tag color="black">✘</Tag>
      ),
    },
  ];

  return (
    <div className="monitor-table-container">
      <div className="monitor-header">
        <h2>Monitor Dashboard</h2>
        <Button onClick={fetchData} loading={loading} type="primary">
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
      />
    </div>
  );
};

export default MonitorTable;
