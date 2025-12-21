import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, InputNumber, Modal, Space, Typography, message } from 'antd';
import MonitorTable from "./Monitor/MonitorTable";
import { httpPost } from './utils/HttpUtils';
import './App.css';

const { Text } = Typography;

type AddQuotaResult = {
  newChars: string;
  addChars: string;
  oldChars: string;
};

const App: React.FC = () => {
  const navigate = useNavigate();

  const [quotaOpen, setQuotaOpen] = useState(false);
  const [shopName, setShopName] = useState('');
  const [addChars, setAddChars] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AddQuotaResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  const resetForm = () => {
    setShopName('');
    setAddChars(null);
  };

  const onSubmitQuota = async () => {
    if (!shopName.trim()) {
      message.warning('请输入商店名');
      return;
    }
    if (addChars === null || Number.isNaN(addChars)) {
      message.warning('请输入添加额度数量');
      return;
    }

    setSubmitting(true);
    try {
      const resp = await httpPost('production', '/todoBConfig', {
        shopName: shopName.trim(),
        addChars,
      });

      let nextResult: AddQuotaResult | null = null;
      if (resp && typeof resp === 'object') {
        const r = resp as Partial<AddQuotaResult>;
        if (typeof r.newChars === 'string' && typeof r.addChars === 'string' && typeof r.oldChars === 'string') {
          nextResult = { newChars: r.newChars, addChars: r.addChars, oldChars: r.oldChars };
        }
      }
      setResult(nextResult);
      setResultOpen(!!nextResult);

      message.success('添加成功');
      setQuotaOpen(false);
      resetForm();
    } catch (e: any) {
      message.error(e?.message ? `添加失败：${e.message}` : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button
          className="debug-prompt-button"
          onClick={() => navigate('/debug-prompt')}
          aria-label="调试 Prompt"
        >
          <svg className="debug-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
            <path d="M19.4 15a1 1 0 0 0 .2 1.1l.8.8a1 1 0 0 1-1.4 1.4l-.8-.8a1 1 0 0 0-1.1-.2 6.96 6.96 0 0 1-1.6.9 1 1 0 0 0-.6 1v1a1 1 0 0 1-2 0v-1a1 1 0 0 0-.6-1 6.96 6.96 0 0 1-1.6-.9 1 1 0 0 0-1.1.2l-.8.8A1 1 0 0 1 5 17.9l.8-.8a1 1 0 0 0 .2-1.1 6.96 6.96 0 0 1-.9-1.6 1 1 0 0 0-1-.6H3a1 1 0 0 1 0-2h1.1a1 1 0 0 0 1-.6c.2-.6.5-1.1.9-1.6a1 1 0 0 0-.2-1.1L5 6.1A1 1 0 0 1 6.4 4.7l.8.8c.4.4.9.6 1.4.4.5-.2 1-.4 1.6-.6.2-.1.5-.1.7 0 .6.2 1.1.4 1.6.6.5.2 1-.1 1.4-.4l.8-.8A1 1 0 0 1 18.9 6l-.8.8c-.3.5-.2 1 .1 1.4.2.5.4 1 .6 1.6.1.2.1.5 0 .7-.2.6-.4 1.1-.6 1.6-.2.5.1 1 .4 1.4l.8.8c.4.4.4 1 0 1.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8c-.4-.4-.9-.6-1.4-.4-.5.2-1 .4-1.6.6-.2.1-.5.1-.7 0-.6-.2-1.1-.4-1.6-.6-.5-.2-1 .1-1.4.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8a1 1 0 0 1 0-1.4l.8-.8c.3-.5.2-1-.1-1.4-.2-.5-.4-1-.6-1.6-.1-.2-.1-.5 0-.7.2-.6.4-1.1.6-1.6.2-.5-.1-1-.4-1.4l-.8-.8A1 1 0 0 1 5 6.1l.8.8c.4.4.9.6 1.4.4.5-.2 1-.4 1.6-.6.2-.1.5-.1.7 0 .6.2 1.1.4 1.6.6.5.2 1-.1 1.4-.4l.8-.8A1 1 0 0 1 18.9 6l-.8.8c-.3.5-.2 1 .1 1.4.2.5.4 1 .6 1.6.1.2.1.5 0 .7-.2.6-.4 1.1-.6 1.6-.2.5.1 1 .4 1.4l.8.8c.4.4.4 1 0 1.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8c-.4-.4-.9-.6-1.4-.4-.5.2-1 .4-1.6.6-.2.1-.5.1-.7 0-.6-.2-1.1-.4-1.6-.6-.5-.2-1 .1-1.4.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8a1 1 0 0 1 0-1.4l.8-.8c.3-.5.2-1-.1-1.4-.2-.5-.4-1-.6-1.6-.1-.2-.1-.5 0-.7.2-.6.4-1.1.6-1.6" />
          </svg>
          <span className="debug-label">调试 Prompt</span>
        </button>
        <button
          className="config-button"
          onClick={() => navigate('/Config')}
          aria-label="配置"
        >
          <svg className="debug-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
            <path d="M19.4 15a1 1 0 0 0 .2 1.1l.8.8a1 1 0 0 1-1.4 1.4l-.8-.8a1 1 0 0 0-1.1-.2 6.96 6.96 0 0 1-1.6.9 1 1 0 0 0-.6 1v1a1 1 0 0 1-2 0v-1a1 1 0 0 0-.6-1 6.96 6.96 0 0 1-1.6-.9 1 1 0 0 0-1.1.2l-.8.8A1 1 0 0 1 5 17.9l.8-.8a1 1 0 0 0 .2-1.1 6.96 6.96 0 0 1-.9-1.6 1 1 0 0 0-1-.6H3a1 1 0 0 1 0-2h1.1a1 1 0 0 0 1-.6c.2-.6.5-1.1.9-1.6a1 1 0 0 0-.2-1.1L5 6.1A1 1 0 0 1 6.4 4.7l.8.8c.4.4.9.6 1.4.4.5-.2 1-.4 1.6-.6.2-.1.5-.1.7 0 .6.2 1.1.4 1.6.6.5.2 1-.1 1.4-.4l.8-.8A1 1 0 0 1 18.9 6l-.8.8c-.3.5-.2 1 .1 1.4.2.5.4 1 .6 1.6.1.2.1.5 0 .7-.2.6-.4 1.1-.6 1.6-.2.5.1 1 .4 1.4l.8.8c.4.4.4 1 0 1.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8c-.4-.4-.9-.6-1.4-.4-.5.2-1 .4-1.6.6-.2.1-.5.1-.7 0-.6-.2-1.1-.4-1.6-.6-.5-.2-1 .1-1.4.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8a1 1 0 0 1 0-1.4l.8-.8c.3-.5.2-1-.1-1.4-.2-.5-.4-1-.6-1.6-.1-.2-.1-.5 0-.7.2-.6.4-1.1.6-1.6.2-.5-.1-1-.4-1.4l-.8-.8A1 1 0 0 1 5 6.1l.8.8c.4.4.9.6 1.4.4.5-.2 1-.4 1.6-.6.2-.1.5-.1.7 0 .6.2 1.1.4 1.6.6.5.2 1-.1 1.4-.4l.8-.8A1 1 0 0 1 18.9 6l-.8.8c-.3.5-.2 1 .1 1.4.2.5.4 1 .6 1.6.1.2.1.5 0 .7-.2.6-.4 1.1-.6 1.6-.2.5.1 1 .4 1.4l.8.8c.4.4.4 1 0 1.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8c-.4-.4-.9-.6-1.4-.4-.5.2-1 .4-1.6.6-.2.1-.5.1-.7 0-.6-.2-1.1-.4-1.6-.6-.5-.2-1 .1-1.4.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8a1 1 0 0 1 0-1.4l.8-.8c.3-.5.2-1-.1-1.4-.2-.5-.4-1-.6-1.6-.1-.2-.1-.5 0-.7.2-.6.4-1.1.6-1.6" />
          </svg>
          <span className="debug-label">配置</span>
        </button>
        <button
          className="increase-quota-button"
          onClick={() => {
            setResult(null);
            setResultOpen(false);
            setQuotaOpen(true);
          }}
          aria-label="增加额度"
        >
          <svg className="debug-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
            <path d="M19.4 15a1 1 0 0 0 .2 1.1l.8.8a1 1 0 0 1-1.4 1.4l-.8-.8a1 1 0 0 0-1.1-.2 6.96 6.96 0 0 1-1.6.9 1 1 0 0 0-.6 1v1a1 1 0 0 1-2 0v-1a1 1 0 0 0-.6-1 6.96 6.96 0 0 1-1.6-.9 1 1 0 0 0-1.1.2l-.8.8A1 1 0 0 1 5 17.9l.8-.8a1 1 0 0 0 .2-1.1 6.96 6.96 0 0 1-.9-1.6 1 1 0 0 0-1-.6H3a1 1 0 0 1 0-2h1.1a1 1 0 0 0 1-.6c.2-.6.5-1.1.9-1.6a1 1 0 0 0-.2-1.1L5 6.1A1 1 0 0 1 6.4 4.7l.8.8c.4.4.9.6 1.4.4.5-.2 1-.4 1.6-.6.2-.1.5-.1.7 0 .6.2 1.1.4 1.6.6.5.2 1-.1 1.4-.4l.8-.8A1 1 0 0 1 18.9 6l-.8.8c-.3.5-.2 1 .1 1.4.2.5.4 1 .6 1.6.1.2.1.5 0 .7-.2.6-.4 1.1-.6 1.6-.2.5.1 1 .4 1.4l.8.8c.4.4.4 1 0 1.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8c-.4-.4-.9-.6-1.4-.4-.5.2-1 .4-1.6.6-.2.1-.5.1-.7 0-.6-.2-1.1-.4-1.6-.6-.5-.2-1 .1-1.4.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8a1 1 0 0 1 0-1.4l.8-.8c.3-.5.2-1-.1-1.4-.2-.5-.4-1-.6-1.6-.1-.2-.1-.5 0-.7.2-.6.4-1.1.6-1.6.2-.5-.1-1-.4-1.4l-.8-.8A1 1 0 0 1 5 6.1l.8.8c.4.4.9.6 1.4.4.5-.2 1-.4 1.6-.6.2-.1.5-.1.7 0 .6.2 1.1.4 1.6.6.5.2 1-.1 1.4-.4l.8-.8A1 1 0 0 1 18.9 6l-.8.8c-.3.5-.2 1 .1 1.4.2.5.4 1 .6 1.6.1.2.1.5 0 .7-.2.6-.4 1.1-.6 1.6-.2.5.1 1 .4 1.4l.8.8c.4.4.4 1 0 1.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8c-.4-.4-.9-.6-1.4-.4-.5.2-1 .4-1.6.6-.2.1-.5.1-.7 0-.6-.2-1.1-.4-1.6-.6-.5-.2-1 .1-1.4.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8a1 1 0 0 1 0-1.4l.8-.8c.3-.5.2-1-.1-1.4-.2-.5-.4-1-.6-1.6-.1-.2-.1-.5 0-.7.2-.6.4-1.1.6-1.6" />
          </svg>
          <span className="debug-label">增加额度</span>
        </button>
        <button
          className="view-store-button"
          onClick={() => navigate('/Shop')}
          aria-label="查看商店"
        >
          <svg className="debug-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
            <path d="M19.4 15a1 1 0 0 0 .2 1.1l.8.8a1 1 0 0 1-1.4 1.4l-.8-.8a1 1 0 0 0-1.1-.2 6.96 6.96 0 0 1-1.6.9 1 1 0 0 0-.6 1v1a1 1 0 0 1-2 0v-1a1 1 0 0 0-.6-1 6.96 6.96 0 0 1-1.6-.9 1 1 0 0 0-1.1.2l-.8.8A1 1 0 0 1 5 17.9l.8-.8a1 1 0 0 0 .2-1.1 6.96 6.96 0 0 1-.9-1.6 1 1 0 0 0-1-.6H3a1 1 0 0 1 0-2h1.1a1 1 0 0 0 1-.6c.2-.6.5-1.1.9-1.6a1 1 0 0 0-.2-1.1L5 6.1A1 1 0 0 1 6.4 4.7l.8.8c.4.4.9.6 1.4.4.5-.2 1-.4 1.6-.6.2-.1.5-.1.7 0 .6.2 1.1.4 1.6.6.5.2 1-.1 1.4-.4l.8-.8A1 1 0 0 1 18.9 6l-.8.8c-.3.5-.2 1 .1 1.4.2.5.4 1 .6 1.6.1.2.1.5 0 .7-.2.6-.4 1.1-.6 1.6-.2.5.1 1 .4 1.4l.8.8c.4.4.4 1 0 1.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8c-.4-.4-.9-.6-1.4-.4-.5.2-1 .4-1.6.6-.2.1-.5.1-.7 0-.6-.2-1.1-.4-1.6-.6-.5-.2-1 .1-1.4.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8a1 1 0 0 1 0-1.4l.8-.8c.3-.5.2-1-.1-1.4-.2-.5-.4-1-.6-1.6-.1-.2-.1-.5 0-.7.2-.6.4-1.1.6-1.6.2-.5-.1-1-.4-1.4l-.8-.8A1 1 0 0 1 5 6.1l.8.8c.4.4.9.6 1.4.4.5-.2 1-.4 1.6-.6.2-.1.5-.1.7 0 .6.2 1.1.4 1.6.6.5.2 1-.1 1.4-.4l.8-.8A1 1 0 0 1 18.9 6l-.8.8c-.3.5-.2 1 .1 1.4.2.5.4 1 .6 1.6.1.2.1.5 0 .7-.2.6-.4 1.1-.6 1.6-.2.5.1 1 .4 1.4l.8.8c.4.4.4 1 0 1.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8c-.4-.4-.9-.6-1.4-.4-.5.2-1 .4-1.6.6-.2.1-.5.1-.7 0-.6-.2-1.1-.4-1.6-.6-.5-.2-1 .1-1.4.4l-.8.8c-.4.4-1 .4-1.4 0l-.8-.8a1 1 0 0 1 0-1.4l.8-.8c.3-.5.2-1-.1-1.4-.2-.5-.4-1-.6-1.6-.1-.2-.1-.5 0-.7.2-.6.4-1.1.6-1.6" />
          </svg>
          <span className="debug-label">查看商店</span>
        </button>
      </header>

      <MonitorTable />

      <Modal
        title="增加额度"
        open={quotaOpen}
        onCancel={() => {
          if (submitting) return;
          setQuotaOpen(false);
        }}
        onOk={onSubmitQuota}
        okText="添加"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 6 }}>商店名</div>
            <Input
              placeholder="请输入商店名"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              disabled={submitting}
              allowClear
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>添加额度数量（可为负数）</div>
            <InputNumber
              style={{ width: '100%' }}
              placeholder="例如：100 或 -50"
              value={addChars}
              onChange={(v) => setAddChars(v)}
              disabled={submitting}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title="本次添加结果"
        open={resultOpen}
        onCancel={() => setResultOpen(false)}
        footer={null}
        destroyOnClose
      >
        {result ? (
          <div style={{ display: 'grid', rowGap: 8 }}>
            <Text>原额度：{result.oldChars}</Text>
            <Text>添加额度：{result.addChars}</Text>
            <Text>新额度：{result.newChars}</Text>
          </div>
        ) : (
          <Text type="secondary">无结果</Text>
        )}
      </Modal>
    </div>
  );
};

export default App;
