import React, { useEffect, useMemo, useState } from 'react';
import { Table, Button, Tag, Input, Select, Progress, Space, Tooltip, Switch, message } from 'antd';
import { DownloadOutlined, SyncOutlined, FileExcelOutlined, CopyOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { httpGet } from "../utils/HttpUtils";
import './MonitorTable.css';

const { Search } = Input;

const MonitorTable: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | number | undefined>(undefined);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(10);

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await httpGet("production", '/monitorv2?includeFinish=false');
      const formattedData = Object.entries(response || {}).map(([key, value]: [string, any]) => {
        // helper: normalize timestamp (allow strings and seconds)
        const normalizeTs = (t: any) => {
          if (t == null) return null;
          const n = Number(t);
          if (Number.isNaN(n)) return null;
          // if looks like seconds (<= 10 digits), convert to ms
          if (n < 1e11) return n * 1000;
          return n;
        };

        const initStart = normalizeTs(value.initStartTime);
        const initEnd = normalizeTs(value.initEndTime);
        const translateStart = normalizeTs(value.translateStartTime ?? value.initEndTime); // fallback if provided
        const translateEnd = normalizeTs(value.translateEndTime);
        const saveEnd = normalizeTs(value.savingShopifyEndTime);

        // 使用 != null 来判断是否存在（允许 0），避免因为 0 被当作 falsy 而丢失时间
        const initTime = (initEnd != null && initStart != null) ? initEnd - initStart : null;
        const transTime = (translateEnd != null && initEnd != null) ? translateEnd - initEnd : null;
        const saveTime = (saveEnd != null && translateEnd != null) ? saveEnd - translateEnd : null;
        // 如果 savingShopifyEndTime 缺失，则退回到 translateEndTime 或 initEndTime，尽量找到最近一次结束时间用于计算上次更新
        const lastEnd = saveEnd ?? translateEnd ?? initEnd ?? null;
        const lastUpdatedTime = lastEnd != null ? Date.now() - lastEnd : null;

        const shopName = value.shopName ? value.shopName.replace(/\.myshopify\.com$/, '') : '';
        const taskShort = `${key.split('-')[0]} - ${value.source} -> ${value.target}`;

        return {
          key,
          taskShort,
          shopName,
          totalCount: value.totalCount ?? 0,
          translatedCount: value.translatedCount ?? 0,
          savedCount: value.savedCount ?? 0,
          usedToken: value.usedToken ?? 0,
          translatedChars: value.translatedChars ?? 0,
          initTime: initTime !== null ? formatTime(initTime) : null,
          transTime: transTime !== null ? formatTime(transTime) : null,
          saveTime: saveTime !== null ? formatTime(saveTime) : null,
          lastUpdatedTime: lastUpdatedTime !== null ? formatTime(lastUpdatedTime) : null,
          status: value.status,
          sendEmail: value.send_email == 1,
        };
      });
      setData(formattedData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let timer: any;
    if (autoRefresh) {
      timer = setInterval(() => fetchData(), Math.max(2000, intervalSeconds * 1000));
    }
    return () => clearInterval(timer);
  }, [autoRefresh, intervalSeconds]);

  const getStatusTag = (status: string | number) => {
    const statusMap: Record<string, string> = {
      '0': '读取shopify数据中',
      '1': '翻译中',
      '2': '写入中',
      '3': '待发送邮件',
      '4': '全部完成',
      '5': '手动中断',
        '6': 'Token Limit',
    };

    // 为不同状态指定颜色
    const colorMap: Record<string, string> = {
      '0': 'geekblue', // 刚创建，信息读取中
      '1': 'blue',     // 翻译中
      '2': 'orange',   // 写入中
      '3': 'cyan',     // 写入结束，待邮件
      '4': 'green',    // 完成
      '5': 'red',      // 中断/异常
        '6': 'red',      // 中断/异常
    };

    const key = String(status);
    if (statusMap[key]) {
      const color = colorMap[key] || 'blue';
      return <Tag color={color}>{statusMap[key]}</Tag>;
    }

    return <Tag color="volcano">任务异常</Tag>;
  };

  const statusOptions = [
    { value: undefined, label: '全部' },
    { value: 0, label: '读取中' },
    { value: 1, label: '翻译中' },
    { value: 2, label: '写入中' },
    { value: 3, label: '完成（待邮件）' },
    { value: 4, label: '全部完成' },
    { value: 5, label: '中断' },
  ];

  const exportCsv = (rows: any[], fileName = 'monitor_export.csv') => {
    if (!rows || rows.length === 0) {
      message.warning('没有数据可导出');
      return;
    }
    const headers = ['taskShort', 'shopName', 'totalCount', 'translatedCount', 'savedCount', 'usedToken', 'translatedChars', 'status', 'lastUpdatedTime'];
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${String(r[h] ?? '-').replace(/"/g, '""') }"`).join(','))).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    message.success('导出完成');
  };

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'taskShort',
      key: 'taskId',
      render: (_: any, record: any) => (
        <div className="task-cell">
          <Tooltip title={record.taskShort} placement="topLeft">
            <div className="task-short">{record.taskShort}</div>
          </Tooltip>
          <div className="task-shop">{record.shopName}</div>
        </div>
      ),
      ellipsis: true,
      width: 260,
    },
    {
      title: '进度',
      key: 'progress',
      render: (_: any, record: any) => {
        const total = Number(record.totalCount) || 0;
        const done = Number(record.translatedCount) || 0;
        const percent = total ? Math.round((done / total) * 100) : 0;
        return (
          <div className="progress-cell">
            <Progress percent={percent} size="small" showInfo={false} strokeColor={{ from: '#13c2c2', to: '#2f54eb' }} />
            <div className="progress-text">{done}/{total}</div>
          </div>
        );
      },
      width: 140,
    },
    {
      title: '总翻译数',
      dataIndex: 'totalCount',
      key: 'totalCount',
      render: (num: number) => num ?? '-',
      width: 100,
    },
    {
      title: '已翻译数',
      dataIndex: 'translatedCount',
      key: 'translatedCount',
      render: (num: number) => num ?? '-',
      width: 100,
    },
    {
      title: '写入数',
      dataIndex: 'savedCount',
      key: 'savedCount',
      render: (num: number) => num ?? '-',
      width: 100,
    },
    {
      title: '花费积分',
      dataIndex: 'usedToken',
      key: 'usedToken',
      render: (num: number) => num ?? '-',
      width: 100,
    },
    {
      title: '翻译长度',
      dataIndex: 'translatedChars',
      key: 'translatedChars',
      render: (num: number) => num ?? '-',
      width: 120,
    },
    {
      title: '初始化时间',
      dataIndex: 'initTime',
      key: 'initTime',
      render: (text: string) => text || '-',
      width: 120,
    },
    {
      title: '翻译时间',
      dataIndex: 'transTime',
      key: 'transTime',
      render: (text: string) => text || '-',
      width: 120,
    },
    {
      title: '保存时间',
      dataIndex: 'saveTime',
      key: 'saveTime',
      render: (text: string) => text || '-',
      width: 120,
    },
    {
      title: '上次更新',
      dataIndex: 'lastUpdatedTime',
      key: 'lastUpdatedTime',
      render: (text: string) => text || '-',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string | number) => getStatusTag(status),
      width: 180,
    },
    {
      title: '邮件',
      dataIndex: 'sendEmail',
      key: 'sendEmail',
      render: (sendEmail: boolean) => (
        sendEmail ? <Tag color="green">✔</Tag> : <Tag color="black">✘</Tag>
      ),
      width: 80,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right' as 'right',
      width: 140,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="复制任务ID">
            <Button icon={<CopyOutlined />} size="small" onClick={() => { navigator.clipboard?.writeText(record.key); message.success('已复制'); }} />
          </Tooltip>
          <Tooltip title="导出该行">
            <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportCsv([record], `monitor_${record.key}.csv`)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch = searchTerm
        ? (row.shopName && row.shopName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (row.taskShort && row.taskShort.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      const matchesStatus = statusFilter === undefined || statusFilter === '' ? true : String(row.status) === String(statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  return (
    <div className="monitor-table-container">
      <div className="monitor-header">
        <div className="monitor-title">
          <h2>Monitor Dashboard</h2>
          <div className="monitor-sub">实时任务监控与进度概览</div>
        </div>

        <Space align="center" size={12}>
          <Search
            placeholder="搜索 Shop 或 Task"
            allowClear
            onSearch={(v) => setSearchTerm(v)}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 260 }}
          />

          <Select
            allowClear
            placeholder="筛选状态"
            style={{ width: 220 }}
            onChange={(val) => setStatusFilter(val)}
            options={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
          />

          <Button onClick={async () => { await fetchData(); message.success('数据已刷新'); }} loading={loading} type="primary" icon={<SyncOutlined />}>
            刷新
          </Button>

          <div className="auto-refresh">
            <Switch checkedChildren={<PlayCircleOutlined />} unCheckedChildren={<PauseCircleOutlined />} checked={autoRefresh} onChange={(v) => setAutoRefresh(v)} />
            <span className="auto-label">自动 ({intervalSeconds}s)</span>
            <Select
              size="small"
              value={String(intervalSeconds)}
              style={{ width: 88 }}
              onChange={(val) => setIntervalSeconds(Number(val))}
              options={[
                { value: '5', label: '5s' },
                { value: '10', label: '10s' },
                { value: '30', label: '30s' },
                { value: '60', label: '60s' },
              ]}
            />
          </div>

          <Button icon={<DownloadOutlined />} onClick={() => exportCsv(filteredData)}>
            导出 CSV
          </Button>
        </Space>
      </div>

      {error && <div className="error-message">{error}</div>}

      <Table
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
      />
    </div>
  );

};

export default MonitorTable;
