import React, {useState} from 'react';
import {Button, Card, Col, Drawer, Input, message, Row, Select, AutoComplete} from 'antd';
import { RobotOutlined, Html5Outlined, DiffOutlined, CloudOutlined, GlobalOutlined, DownloadOutlined } from '@ant-design/icons';
import './DebugPrompt.css';
import {httpPost} from "../utils/HttpUtils";

const { TextArea } = Input;

const DebugPrompt: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [apiResponse, setApiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState('');
  const [htmlToJsonLoading, setHtmlToJsonLoading] = useState(false);
  const [htmlToJson, setHtmlToJson] = useState('');
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [model, setModel] = useState('AliYun');
  const [picUrl, setPicUrl] = useState('');

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);
  };

  const callAiApi = async () => {
    if (!prompt.trim() || !targetLanguage.trim()) {
      message.error('Prompt 和目标语言不能为空！');
      return;
    }
    setLoading(true);
    const payload = { prompt, target: targetLanguage, json: htmlToJson, model, picUrl };
    console.log('promptTest payload:', payload);
    const response = await httpPost("production", '/promptTest', JSON.stringify({ prompt, target: targetLanguage, json: htmlToJson, model, picUrl }));
    console.log('promptTest reponse:', response);
    setApiResponse(JSON.stringify(response, null, 2));
    setLoading(false);
  };

  const handleHtmlToJson = async () => {
    if (!translation.trim()) {
      message.error('翻译内容和目标语言不能为空！');
      return;
    }
    setHtmlToJsonLoading(true);
    const response = await httpPost("production", '/htmlToJson', JSON.stringify({ html: translation }));
    setHtmlToJson(JSON.stringify(response, null, 2));
    setHtmlToJsonLoading(false);
  };

  const showComparisonDrawer = () => {
    setIsDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerVisible(false);
  };

  const getApiContent = (): React.ReactNode => {
    if (!apiResponse) return '等待调用...';
    try {
      const parsed = JSON.parse(apiResponse);
      console.log('parsed:', parsed);
      const modelType = parsed?.translateModel?.model;
      const content = parsed?.content ?? parsed;
      const token = parsed?.allToken ?? parsed?.translateModel?.allToken;
      const isDataImage =
        typeof content === 'string' && content.startsWith('data:image');
      const shouldShowImage = modelType === 'pic' || isDataImage;

      if (shouldShowImage && typeof content === 'string') {
        const match = content.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/);
        const ext = match?.[1] || 'png';
        const filename = `image.${ext}`;
        const onDownload = () => {
          const a = document.createElement('a');
          a.href = content;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        };
        return (
          <div>
            <img src={content} alt="result" style={{ maxWidth: '100%' }} />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button icon={<DownloadOutlined />} onClick={onDownload}>下载图片</Button>
              {token != null && <div style={{ color: '#555' }}>消耗 Token: {token}</div>}
            </div>
          </div>
        );
      }

      const node = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      return (
        <div>
          {node}
          {token != null && <div style={{ marginTop: 8, color: '#555' }}>消耗 Token: {token}</div>}
        </div>
      );
    } catch {
      return 'API 返回内容无法解析';
    }
  };

  return (
    <div className="debug-prompt-container">
      <Row gutter={[16, 16]} className="debug-row">
        <Col xs={24} lg={12}>
          <Card title="输入你的 Prompt">
            <div className="card-body">
              <TextArea
                className="prompt-input"
                value={prompt}
                onChange={handlePromptChange}
                placeholder="输入你的 Prompt..."
                autoSize={{ minRows: 8, maxRows: 30 }}
              />

              <div className="actions">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 12, color: '#555' }}>目标语言</label>
                    <Input
                      placeholder="目标语言"
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      style={{ width: 120 }}
                      maxLength={10}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 12, color: '#555' }}>图片 URL (可选)</label>
                    <Input
                      placeholder="图片 URL"
                      value={picUrl}
                      onChange={(e) => setPicUrl(e.target.value)}
                      style={{ width: 180 }}
                    />
                  </div>
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <label style={{ fontSize: 12, color: '#555' }}>模型选择</label>
                     <AutoComplete
                       className="model-select"
                       value={model}
                       onChange={(val) => setModel(val)}
                       style={{ width: 180 }}
                       options={[
                         { value: 'AliYun', label: 'AliYun' },
                         { value: 'qwen-max', label: '阿里云(qwen-max)' },
                         { value: 'gpt', label: 'ChatGpt' },
                         { value: 'DeepL', label: 'DeepL' },
                         { value: 'gemini-2.5-flash-image', label: 'Gemini图片翻译' },
                         { value: 'gemini-2.5-flash', label: 'Gemini文本翻译' },
                       ]}
                       placeholder="选择或输入模型"
                       filterOption={(inputValue, option) =>
                         option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                       }
                     />
                   </div>
                   <Button
                     type="default"
                     className="btn-primary"
                     onClick={callAiApi}
                     loading={loading}
                     icon={<RobotOutlined />}
                   >
                     调用 AI 接口
                   </Button>
                 </div>
               </div>
             </div>
           </Card>

          <Card title="API 返回内容">
            <div className="api-card-body">
              <div className="api-response">{getApiContent()}</div>
              <Button
                type="default"
                onClick={showComparisonDrawer}
                style={{ marginTop: '10px' }}
                icon={<DiffOutlined />}
              >
                对比前后 JSON
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>

          <Card title="输入你的待翻译html">
            <div className="translation-card-body">
              <TextArea
                className="translation-input"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="输入你的待翻译html..."
                autoSize={{ minRows: 6, maxRows: 20 }}
              />
              <Button
                type="default"
                className="btn-html-to-json"
                onClick={handleHtmlToJson}
                loading={htmlToJsonLoading}
                style={{ marginTop: '10px' }}
                icon={<Html5Outlined />}
              >
                HTML -{" > "} JSON
              </Button>
            </div>
          </Card>

          <Card title="HTML 转 JSON 结果" style={{ marginTop: 12 }}>
            <div className="html-to-json-result">
              {htmlToJsonLoading ? (
                <p>加载中...</p>
              ) : (
                <pre className="mono-block">
                  {htmlToJson || '暂无数据'}
                </pre>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Drawer
        title="JSON 对比"
        placement="right"
        onClose={handleDrawerClose}
        open={isDrawerVisible}
        width={800}
      >
        <Row gutter={16}>
          <Col span={12}>
            <div className="compare-panel">
              <div className="compare-title">HTML 转 JSON 结果</div>
              <pre className="mono-block">{htmlToJson || '暂无数据'}</pre>
            </div>
          </Col>
          <Col span={12}>
            <div className="compare-panel">
              <div className="compare-title">API 返回内容</div>
              <div className="mono-block">{getApiContent()}</div>
            </div>
          </Col>
        </Row>
      </Drawer>
    </div>
  );
};

export default DebugPrompt;
