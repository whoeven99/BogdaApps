import React, { useState } from 'react';
import { Row, Col, Input, Form, Button, Card, Drawer } from 'antd';
import './DebugPrompt.css';
import { httpPost } from "../utils/HttpUtils";

const { TextArea } = Input;

const DebugPrompt: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [apiResponse, setApiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState('');
  const [htmlToJsonLoading, setHtmlToJsonLoading] = useState(false);
  const [htmlToJson, setHtmlToJson] = useState('');
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const extractVariables = (input: string) => {
    const matches = input.match(/{{(.*?)}}/g);
    if (matches) {
      const vars = matches.reduce((acc, match) => {
        const key = match.replace(/{{|}}/g, '');
        acc[key] = '';
        return acc;
      }, {} as Record<string, string>);
      setVariables(vars);
    } else {
      setVariables({});
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);
    extractVariables(value);
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  };

  const callAiApi = async () => {
    setLoading(true);
    const response = await httpPost("production", '/promptTest', JSON.stringify({ prompt: prompt, target: "en", content: "" }));
    setApiResponse(JSON.stringify(response, null, 2));
    setLoading(false);
  };

  const handleHtmlToJson = async () => {
    setHtmlToJsonLoading(true);
    const response = await httpPost("production", '/htmlToJson', JSON.stringify({ html: translation, target: "en" }));
    setHtmlToJson(JSON.stringify(response, null, 2));
    setHtmlToJsonLoading(false);
  };

  const showComparisonDrawer = () => {
      console.log("click show drawer"); // 添加日志以确认点击事件触发
      console.log("isDrawerVisible state:", isDrawerVisible); // 添加日志以确认状态更新
    setIsDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerVisible(false);
  };

  const getApiContent = () => {
    try {
      const parsedResponse = JSON.parse(apiResponse);
      return parsedResponse.content || '内容字段不存在';
    } catch (error) {
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
              />

              <div className="actions">
                <Button
                  type="default"
                  className="btn-clear"
                  onClick={() => {
                    setPrompt('');
                    setVariables({});
                  }}
                >
                  清空
                </Button>
                <Button
                  type="default"
                  className="btn-primary"
                  onClick={callAiApi}
                  loading={loading}
                >
                  调用 AI 接口
                </Button>
              </div>
            </div>
          </Card>

          <Card title="API 返回内容">
            <div className="api-card-body">
              <pre className="api-response">
                {apiResponse || '等待调用...'}
              </pre>
              <Button
                type="default"
                onClick={showComparisonDrawer}
                style={{ marginTop: '10px' }}
              >
                对比前后 JSON
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="变量编辑" style={{ marginBottom: 12 }}>
            <div className="variables-scroll">
              <Form layout="vertical">
                {Object.keys(variables).length ? Object.keys(variables).map((key) => (
                  <Form.Item label={key} key={key} className="variable-item">
                    <Input
                      value={variables[key]}
                      onChange={(e) => handleVariableChange(key, e.target.value)}
                    />
                  </Form.Item>
                )) : (
                  <div className="variables-empty">没有检测到变量 — 使用 {"{{varName}}"} 格式</div>
                )}
              </Form>
            </div>
          </Card>

          <Card title="输入你的翻译内容">
            <div className="translation-card-body">
              <TextArea
                className="translation-input"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="输入你的翻译内容..."
              />
              <Button
                type="default"
                className="btn-html-to-json"
                onClick={handleHtmlToJson}
                loading={htmlToJsonLoading}
                style={{ marginTop: '10px' }}
              >
                HTML -{" > " } JSON
              </Button>
            </div>
          </Card>

          <Card title="HTML 转 JSON 结果" style={{ marginTop: 12 }}>
            <div className="html-to-json-result">
              {htmlToJsonLoading ? (
                <p>加载中...</p>
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap' }}>
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
            <h3>HTML 转 JSON 结果</h3>
            <pre style={{ whiteSpace: 'pre-wrap', border: '1px solid #ddd', padding: '10px' }}>
              {htmlToJson || '暂无数据'}
            </pre>
          </Col>
          <Col span={12}>
            <h3>API 返回内容</h3>
            <pre style={{ whiteSpace: 'pre-wrap', border: '1px solid #ddd', padding: '10px' }}>
              {getApiContent()}
            </pre>
          </Col>
        </Row>
      </Drawer>
    </div>
  );
};

export default DebugPrompt;
