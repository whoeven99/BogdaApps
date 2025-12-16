import React, { useState } from 'react';
import { Row, Col, Input, Form, Button, Card } from 'antd';
import './DebugPrompt.css';

const { TextArea } = Input;

const DebugPrompt: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [apiResponse, setApiResponse] = useState('');
  const [loading, setLoading] = useState(false);

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
    try {
      const response = await fetch('/api/ai-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, variables }),
      });
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiResponse(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="debug-prompt-container">
      <Row gutter={[16, 16]} className="debug-row">
        <Col xs={24} lg={12}>
          <Card title="输入你的 Prompt" className="left-card">
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

          <Card title="API 返回内容">
            <div className="api-card-body">
              <pre className="api-response">
                {apiResponse || '等待调用...'}
              </pre>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DebugPrompt;
