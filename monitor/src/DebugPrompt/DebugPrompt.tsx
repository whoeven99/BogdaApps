import React, { useState, useEffect } from 'react';
import { Button, Card, Col, Drawer, Input, message, Row, Select, Tabs, Table, Space, InputNumber, Rate, Typography, Tag } from 'antd';
import { RobotOutlined, Html5Outlined, DiffOutlined, DownloadOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import './DebugPrompt.css';
import { httpPost } from "../utils/HttpUtils";

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Text } = Typography;

const MODEL_OPTIONS = [
  { value: 'AliYun', label: 'AliYun' },
  { value: 'qwen-max', label: '阿里云(qwen-max)' },
  { value: 'gpt', label: 'ChatGpt' },
  { value: 'DeepL', label: 'DeepL' },
  { value: 'gemini-2.5-flash-image', label: 'Gemini图片翻译' },
  { value: 'gemini-2.5-flash', label: 'Gemini文本翻译' },
];

const extractVariables = (text: string) => {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].trim());
  }
  return Array.from(new Set(matches)); // unique variables
};

const substituteVariables = (text: string, vars: Record<string, string>) => {
  let result = text;
  Object.entries(vars).forEach(([key, val]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || '');
  });
  return result;
};

const DebugPrompt: React.FC = () => {
  // === Common States ===
  const [prompt, setPrompt] = useState('');
  const [variableNames, setVariableNames] = useState<string[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [models, setModels] = useState<string[]>(['AliYun']);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [picUrl, setPicUrl] = useState('');
  const [activeTab, setActiveTab] = useState('single');

  // === Single Debug States ===
  const [apiResponses, setApiResponses] = useState<Record<string, any>>({});
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});
  const [translation, setTranslation] = useState('');
  const [htmlToJsonLoading, setHtmlToJsonLoading] = useState(false);
  const [htmlToJson, setHtmlToJson] = useState('');
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  // === Batch Testing States ===
  const [testDatasetStr, setTestDatasetStr] = useState<string>('[\n  { "var1": "value1", "expected": "result1" }\n]');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testingBatch, setTestingBatch] = useState(false);

  // Parse prompt for variables
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPrompt(value);
    const vars = extractVariables(value);
    setVariableNames(vars);
    setVariables(prev => {
      const next = { ...prev };
      vars.forEach(v => {
        if (!(v in next)) next[v] = '';
      });
      return next;
    });
  };

  const handleVariableChange = (key: string, val: string) => {
    setVariables(prev => ({ ...prev, [key]: val }));
  };

  // Single Debug API Call
  const callAiApi = async () => {
    if (!prompt.trim()) {
      message.error('Prompt 不能为空！');
      return;
    }
    if (models.length === 0) {
      message.error('请至少选择一个模型！');
      return;
    }

    const finalPrompt = substituteVariables(prompt, variables);
    setApiResponses({});
    
    models.forEach(async (m) => {
      setLoadingModels(prev => ({ ...prev, [m]: true }));
      try {
        const payload = { prompt: finalPrompt, target: targetLanguage, json: htmlToJson, model: m, picUrl };
        const response = await httpPost("production", '/promptTest', JSON.stringify(payload));
        setApiResponses(prev => ({ ...prev, [m]: response }));
      } catch (err) {
        setApiResponses(prev => ({ ...prev, [m]: { error: String(err) } }));
      } finally {
        setLoadingModels(prev => ({ ...prev, [m]: false }));
      }
    });
  };

  // HTML to JSON (Legacy)
  const handleHtmlToJson = async () => {
    if (!translation.trim()) {
      message.error('翻译内容不能为空！');
      return;
    }
    setHtmlToJsonLoading(true);
    try {
      const response = await httpPost("production", '/htmlToJson', JSON.stringify({ html: translation }));
      setHtmlToJson(JSON.stringify(response, null, 2));
    } catch (e) {
      message.error("HTML转JSON失败");
    } finally {
      setHtmlToJsonLoading(false);
    }
  };

  // Batch Testing API Call
  const runBatchTest = async () => {
    if (!prompt.trim()) {
      message.error('Prompt 不能为空！');
      return;
    }
    if (models.length === 0) {
      message.error('请至少选择一个模型！');
      return;
    }
    try {
      const dataset = JSON.parse(testDatasetStr);
      if (!Array.isArray(dataset)) {
        message.error("测试数据集必须是一个 JSON 数组");
        return;
      }
      setTestingBatch(true);
      const results: any[] = [];

      for (let i = 0; i < dataset.length; i++) {
        const itemVars = dataset[i];
        const finalPrompt = substituteVariables(prompt, itemVars);
        
        const rowResult: any = {
          key: i.toString(),
          variables: itemVars,
          modelResponses: {},
          scores: {}
        };

        await Promise.all(models.map(async (m) => {
          try {
            const response = await httpPost("production", '/promptTest', JSON.stringify({ 
              prompt: finalPrompt, 
              target: targetLanguage, 
              json: htmlToJson, 
              model: m, 
              picUrl 
            }));
            rowResult.modelResponses[m] = response;
          } catch(e) {
            rowResult.modelResponses[m] = { error: String(e) };
          }
        }));
        results.push(rowResult);
        setTestResults([...results]); // Update dynamically
      }
      message.success("批量测试完成");
    } catch (e) {
      message.error("JSON 格式错误: " + String(e));
    } finally {
      setTestingBatch(false);
    }
  };

  const handleScoreChange = (recordKey: string, model: string, score: number) => {
    setTestResults(prev => prev.map(item => {
      if (item.key === recordKey) {
        return {
          ...item,
          scores: { ...item.scores, [model]: score }
        };
      }
      return item;
    }));
  };

  const renderApiContent = (responseObj: any): React.ReactNode => {
    if (!responseObj) return '等待调用...';
    try {
      const parsed = typeof responseObj === 'string' ? JSON.parse(responseObj) : responseObj;
      const modelType = parsed?.translateModel?.model;
      const content = parsed?.content ?? parsed;
      const token = parsed?.allToken ?? parsed?.translateModel?.allToken;
      const isDataImage = typeof content === 'string' && content.startsWith('data:image');
      const shouldShowImage = modelType === 'pic' || isDataImage;

      if (shouldShowImage && typeof content === 'string') {
        const match = content.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/);
        const ext = match?.[1] || 'png';
        return (
          <div>
            <img src={content} alt="result" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button icon={<DownloadOutlined />} onClick={() => {
                const a = document.createElement('a');
                a.href = content;
                a.download = `image.${ext}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              }}>下载图片</Button>
              {token != null && <div style={{ color: '#555' }}>Token: {token}</div>}
            </div>
          </div>
        );
      }

      const node = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      return (
        <div>
          <pre className="mono-block" style={{ margin: 0, padding: 8, maxHeight: '300px', overflow: 'auto' }}>{node}</pre>
          {token != null && <div style={{ marginTop: 8, color: '#555' }}>Token: {token}</div>}
        </div>
      );
    } catch {
      return <pre className="mono-block" style={{ margin: 0, padding: 8 }}>{typeof responseObj === 'object' ? JSON.stringify(responseObj, null, 2) : String(responseObj)}</pre>;
    }
  };

  const getBatchTableColumns = () => {
    const cols: any[] = [
      {
        title: '测试用例 (变量)',
        dataIndex: 'variables',
        key: 'variables',
        width: 200,
        render: (vars: any) => (
          <pre style={{ fontSize: '12px', margin: 0 }}>
            {JSON.stringify(vars, null, 2)}
          </pre>
        ),
      }
    ];

    models.forEach(m => {
      cols.push({
        title: `模型: ${m}`,
        dataIndex: ['modelResponses', m],
        key: m,
        width: 300,
        render: (resp: any, record: any) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              {resp ? renderApiContent(resp) : <Text type="secondary">等待中...</Text>}
            </div>
            {resp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                <Text strong>评分:</Text>
                <Rate 
                  allowHalf 
                  value={record.scores[m] || 0} 
                  onChange={(val) => handleScoreChange(record.key, m, val)} 
                />
              </div>
            )}
          </div>
        )
      });
    });

    return cols;
  };

  return (
    <div className="debug-prompt-container">
      <Card className="main-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
          <TabPane tab="单次调试" key="single">
            <Row gutter={[16, 16]} className="debug-row">
              {/* Left Column: Prompt & Config */}
              <Col xs={24} lg={12}>
                <Card title="Prompt 配置" bordered={false} className="inner-card">
                  <div className="card-body">
                    <TextArea
                      className="prompt-input"
                      value={prompt}
                      onChange={handlePromptChange}
                      placeholder="输入你的 Prompt，支持使用 {{变量名}} 插入变量..."
                      autoSize={{ minRows: 6, maxRows: 15 }}
                    />
                    
                    {variableNames.length > 0 && (
                      <div className="variables-container" style={{ marginTop: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>检测到的变量：</Text>
                        <Row gutter={[8, 8]}>
                          {variableNames.map(v => (
                            <Col span={12} key={v}>
                              <Input 
                                addonBefore={`{{${v}}}`} 
                                value={variables[v]} 
                                onChange={e => handleVariableChange(v, e.target.value)} 
                                placeholder="输入变量值"
                              />
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    <div className="actions" style={{ marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                      <Space wrap>
                        <div>
                          <label style={{ fontSize: 12, color: '#555', display: 'block' }}>目标语言</label>
                          <Input value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} style={{ width: 120 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: '#555', display: 'block' }}>图片 URL (可选)</label>
                          <Input value={picUrl} onChange={(e) => setPicUrl(e.target.value)} style={{ width: 180 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: '#555', display: 'block' }}>模型选择 (可多选)</label>
                          <Select
                            mode="multiple"
                            allowClear
                            value={models}
                            onChange={setModels}
                            style={{ minWidth: 250 }}
                            options={MODEL_OPTIONS}
                            placeholder="选择模型"
                          />
                        </div>
                        <Button
                          type="primary"
                          onClick={callAiApi}
                          loading={Object.values(loadingModels).some(v => v)}
                          icon={<RobotOutlined />}
                          style={{ marginTop: 18 }}
                        >
                          调用 AI 接口
                        </Button>
                      </Space>
                    </div>
                  </div>
                </Card>
              </Col>

              {/* Right Column: API Responses */}
              <Col xs={24} lg={12}>
                <Card title="API 返回内容" bordered={false} className="inner-card">
                  <div className="api-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {models.length === 0 ? (
                      <Text type="secondary">请先选择模型并调用接口</Text>
                    ) : (
                      models.map(m => (
                        <Card key={m} size="small" title={<Tag color="blue">{m}</Tag>} style={{ background: '#fafafa' }}>
                          {loadingModels[m] ? (
                            <Text type="secondary">加载中...</Text>
                          ) : (
                            <div className="api-response" style={{ maxHeight: 300, overflow: 'auto' }}>
                              {renderApiContent(apiResponses[m])}
                            </div>
                          )}
                        </Card>
                      ))
                    )}
                    
                    <Button type="default" onClick={() => setIsDrawerVisible(true)} icon={<DiffOutlined />}>
                      旧版 HTML/JSON 对比
                    </Button>
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="批量测试与打分" key="batch">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="测试数据集 (JSON 数组)" bordered={false} className="inner-card">
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    配置一个包含多个测试对象的 JSON 数组。对象的 key 需与 Prompt 中的变量名 {{`{{key}}`}} 对应。
                  </Text>
                  <TextArea
                    value={testDatasetStr}
                    onChange={e => setTestDatasetStr(e.target.value)}
                    autoSize={{ minRows: 6, maxRows: 15 }}
                    style={{ fontFamily: 'monospace' }}
                  />
                  <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Select
                      mode="multiple"
                      allowClear
                      value={models}
                      onChange={setModels}
                      style={{ minWidth: 250 }}
                      options={MODEL_OPTIONS}
                      placeholder="选择测试模型"
                    />
                    <Button type="primary" icon={<PlayCircleOutlined />} onClick={runBatchTest} loading={testingBatch}>
                      开始批量测试
                    </Button>
                    {testingBatch && <Text type="secondary">正在执行测试，请稍候...</Text>}
                  </div>
                </Card>
              </Col>
              
              {testResults.length > 0 && (
                <Col span={24}>
                  <Card title="测试结果与打分" bordered={false} className="inner-card">
                    <Table 
                      dataSource={testResults} 
                      columns={getBatchTableColumns()} 
                      pagination={false}
                      bordered
                      scroll={{ x: 'max-content' }}
                    />
                  </Card>
                </Col>
              )}
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* Legacy HTML to JSON Comparison Drawer */}
      <Drawer title="旧版工具：HTML 翻译与 JSON 对比" placement="right" onClose={() => setIsDrawerVisible(false)} open={isDrawerVisible} width={800}>
        <Row gutter={16}>
          <Col span={24} style={{ marginBottom: 16 }}>
            <Card title="输入待翻译 HTML" size="small">
              <TextArea value={translation} onChange={(e) => setTranslation(e.target.value)} autoSize={{ minRows: 4 }} />
              <Button type="primary" onClick={handleHtmlToJson} loading={htmlToJsonLoading} style={{ marginTop: 10 }} icon={<Html5Outlined />}>
                HTML -> JSON
              </Button>
            </Card>
          </Col>
          <Col span={12}>
            <div className="compare-panel">
              <div className="compare-title">HTML 转 JSON 结果</div>
              <pre className="mono-block">{htmlToJson || '暂无数据'}</pre>
            </div>
          </Col>
          <Col span={12}>
            <div className="compare-panel">
              <div className="compare-title">首个模型 API 返回</div>
              <div className="mono-block">{renderApiContent(apiResponses[models[0]])}</div>
            </div>
          </Col>
        </Row>
      </Drawer>
    </div>
  );
};

export default DebugPrompt;
