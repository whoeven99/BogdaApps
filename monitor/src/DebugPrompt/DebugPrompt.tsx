import React, { useState } from 'react';
import { Button, Card, Col, Drawer, Input, message, Row, Select, Tabs, Table, Space, Rate, Typography, Tag, Slider, InputNumber, Divider, Switch } from 'antd';
import { RobotOutlined, Html5Outlined, DiffOutlined, DownloadOutlined, PlayCircleOutlined, SettingOutlined, EditOutlined, FunctionOutlined, SendOutlined, SyncOutlined, PictureOutlined } from '@ant-design/icons';
import './DebugPrompt.css';
import { httpPost } from "../utils/HttpUtils";

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Text, Title } = Typography;

const MODEL_OPTIONS = [
  { value: 'kimi-k2-0905-preview', label: 'kimi-k2.5' },
  { value: 'gemini-3-pro-preview', label: 'gemini-3-flash-preview' },
  { value: 'qwen-plus', label: 'qwen-max' },
  { value: 'gpt-4.1', label: 'gpt-4.1' },
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
  const [prompt, setPrompt] = useState('# 角色\n你是一个图片分析大师，可以通过用户输入的图片解析图片的内容。\n\n## 技能: 分析图片, 给出建议\n根据用户的问题{{query}}，结合用户传入的图片，为用户分析图片，给出合理的指引。对于不同主题，需要能够体现图片的含义，猜测用户询问该图片的目的等。\n回复使用以下格式 (内容可以合理使用 emoji 表情, 让内容更生动):\n\n## 输出格式\n#### 基本信息\n- 🎨 图片解析内容：\n- 🎨 图片主题：\n- 🎨 图片可能来自于：\n- 🎨 其他解释：\n\n## 限制:\n- 所输出的内容必须按照给定的格式进行组织，不能偏离框架要求。');
  const [variableNames, setVariableNames] = useState<string[]>(['query']);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [models, setModels] = useState<string[]>(['kimi-k2-0905-preview']);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [picUrl, setPicUrl] = useState('');
  const [activeTab, setActiveTab] = useState('single');

  // Mock Params
  const [temperature, setTemperature] = useState<number>(0.8);
  const [topP, setTopP] = useState<number>(0.7);
  const [presencePenalty, setPresencePenalty] = useState<number>(0);
  const [maxTokens, setMaxTokens] = useState<number>(4096);

  // === Single Debug States ===
  const [apiResponses, setApiResponses] = useState<Record<string, any>>({});
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});
  const [translation, setTranslation] = useState('');
  const [htmlToJsonLoading, setHtmlToJsonLoading] = useState(false);
  const [htmlToJson, setHtmlToJson] = useState('');
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [runMode, setRunMode] = useState<'single' | 'multiple'>('multiple');

  // === Batch Testing States ===
  const [testDatasetStr, setTestDatasetStr] = useState<string>('[\n  { "query": "帮我看看这是什么" }\n]');
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
    
    // If single mode, just take the first selected model
    const modelsToRun = runMode === 'single' ? [models[0]] : models;

    modelsToRun.forEach(async (m) => {
      setLoadingModels(prev => ({ ...prev, [m]: true }));
      try {
        const payload = { 
          prompt: finalPrompt, 
          target: targetLanguage, 
          json: htmlToJson, 
          model: m, 
          picUrl,
          temperature,
          topP,
          presencePenalty,
          maxTokens
        };
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
              picUrl,
              temperature,
              topP,
              presencePenalty,
              maxTokens
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
    if (!responseObj) return null;
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
            <img src={content} alt="result" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: 8 }} />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => {
                const a = document.createElement('a');
                a.href = content;
                a.download = `image.${ext}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              }}>下载图片</Button>
              {token != null && <Text type="secondary" style={{ fontSize: 12 }}>Token: {token}</Text>}
            </div>
          </div>
        );
      }

      const node = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      return (
        <div>
          <div className="message-content">{node}</div>
          {token != null && <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>Token: {token}</Text>}
        </div>
      );
    } catch {
      return <div className="message-content">{typeof responseObj === 'object' ? JSON.stringify(responseObj, null, 2) : String(responseObj)}</div>;
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
          <pre style={{ fontSize: '12px', margin: 0, background: '#f9fafb', padding: 8, borderRadius: 6 }}>
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
        width: 350,
        render: (resp: any, record: any) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ flex: 1, maxHeight: 250, overflow: 'auto', background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              {resp ? renderApiContent(resp) : <Text type="secondary">等待中...</Text>}
            </div>
            {resp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed #e5e7eb', paddingTop: '8px' }}>
                <Text strong style={{ fontSize: 13 }}>评分:</Text>
                <Rate 
                  allowHalf 
                  value={record.scores[m] || 0} 
                  onChange={(val) => handleScoreChange(record.key, m, val)} 
                  style={{ fontSize: 14 }}
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
      <div style={{ display: 'flex', gap: 24, marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}>
         <Button type={activeTab === 'single' ? 'primary' : 'text'} onClick={() => setActiveTab('single')}>编排与调试</Button>
         <Button type={activeTab === 'batch' ? 'primary' : 'text'} onClick={() => setActiveTab('batch')}>批量评测</Button>
         <Button type="text" onClick={() => setIsDrawerVisible(true)} icon={<DiffOutlined />}>旧版工具</Button>
      </div>

      {activeTab === 'single' && (
        <Row gutter={16} style={{ height: 'calc(100vh - 100px)' }}>
          {/* Column 1: Prompt Template */}
          <Col span={10} className="prompt-col">
            <Card title="Prompt 模板" style={{ height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="prompt-editor-wrapper">
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>System</Text>
                <TextArea
                  className="prompt-textarea"
                  value={prompt}
                  onChange={handlePromptChange}
                  placeholder="输入你的 Prompt，支持使用 {{变量名}} 插入变量..."
                />
              </div>
            </Card>
          </Col>

          {/* Column 2: Configuration */}
          <Col span={6} className="config-col">
            <Card title="常用配置" style={{ height: '100%', overflowY: 'auto' }}>
              <div className="config-section">
                <div className="config-section-title">模型配置</div>
                <Select
                  mode="multiple"
                  value={models}
                  onChange={setModels}
                  style={{ width: '100%' }}
                  options={MODEL_OPTIONS}
                  placeholder="选择模型"
                />
              </div>

              <Divider style={{ margin: '16px 0' }} />

              <div className="config-section">
                <div className="config-section-title">参数配置</div>
                
                <div className="config-item">
                  <div className="config-item-label">生成随机性 (Temp)</div>
                  <div className="config-item-control">
                    <Slider min={0} max={1} step={0.1} value={temperature} onChange={setTemperature} />
                    <InputNumber min={0} max={1} step={0.1} value={temperature} onChange={val => setTemperature(val || 0)} size="small" />
                  </div>
                </div>

                <div className="config-item">
                  <div className="config-item-label">Top P</div>
                  <div className="config-item-control">
                    <Slider min={0} max={1} step={0.1} value={topP} onChange={setTopP} />
                    <InputNumber min={0} max={1} step={0.1} value={topP} onChange={val => setTopP(val || 0)} size="small" />
                  </div>
                </div>

                <div className="config-item">
                  <div className="config-item-label">重复语句惩罚</div>
                  <div className="config-item-control">
                    <Slider min={-2} max={2} step={0.1} value={presencePenalty} onChange={setPresencePenalty} />
                    <InputNumber min={-2} max={2} step={0.1} value={presencePenalty} onChange={val => setPresencePenalty(val || 0)} size="small" />
                  </div>
                </div>

                <div className="config-item">
                  <div className="config-item-label">最大回复长度</div>
                  <div className="config-item-control">
                    <Slider min={1} max={8192} step={1} value={maxTokens} onChange={setMaxTokens} />
                    <InputNumber min={1} max={8192} value={maxTokens} onChange={val => setMaxTokens(val || 4096)} size="small" />
                  </div>
                </div>
              </div>

              <Divider style={{ margin: '16px 0' }} />

              <div className="config-section">
                <div className="config-section-title">Prompt 变量</div>
                {variableNames.length > 0 ? (
                  <div className="variable-list">
                    {variableNames.map(v => (
                      <div className="variable-item" key={v}>
                        <Text strong style={{ fontSize: 13, marginBottom: 4, display: 'block', color: '#4b5563' }}>{v}</Text>
                        <Input 
                          value={variables[v]} 
                          onChange={e => handleVariableChange(v, e.target.value)} 
                          placeholder="请输入变量值"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>暂无变量，可在 Prompt 中通过 {"{{变量名}}"} 添加</Text>
                )}
              </div>

              <Divider style={{ margin: '16px 0' }} />

              <div className="config-section">
                <div className="config-section-title">函数 <Switch size="small" style={{ marginLeft: 'auto', float: 'right' }} /></div>
                <Button type="dashed" block icon={<FunctionOutlined />}>+ 新增函数</Button>
              </div>

              <div className="config-section">
                <div className="config-section-title">其他参数</div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>目标语言 (targetLanguage)</Text>
                  <Input value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} placeholder="如: 英文" />
                </div>
              </div>
            </Card>
          </Col>

          {/* Column 3: Preview & Debug */}
          <Col span={8} className="preview-col">
            <div className="preview-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>预览与调试</Title>
                <Button type="text" icon={<SyncOutlined />} size="small">调试历史</Button>
              </div>

              <div className="preview-messages">
                {models.length === 0 && <div style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>暂无结果</div>}
                
                {(runMode === 'single' ? [models[0]] : models).filter(Boolean).map(m => {
                  if (!apiResponses[m] && !loadingModels[m]) return null;
                  
                  return (
                    <div className="message-box" key={m}>
                      <div className="message-box-header">
                        <RobotOutlined style={{ color: '#6366f1' }} />
                        <span style={{ fontWeight: 500 }}>{MODEL_OPTIONS.find(opt => opt.value === m)?.label || m}</span>
                        {loadingModels[m] && <span style={{ marginLeft: 'auto', fontSize: 12 }}>响应中...</span>}
                      </div>
                      {!loadingModels[m] && renderApiContent(apiResponses[m])}
                    </div>
                  );
                })}
              </div>

              <div className="preview-input-area">
                <div className="run-mode-selector">
                  <div className={`run-mode-card ${runMode === 'single' ? 'active' : ''}`} onClick={() => setRunMode('single')}>
                    <div className="run-mode-title"><SyncOutlined /> 单次运行</div>
                    <div className="run-mode-desc">模型每次只输出一条回复</div>
                  </div>
                  <div className={`run-mode-card ${runMode === 'multiple' ? 'active' : ''}`} onClick={() => setRunMode('multiple')}>
                    <div className="run-mode-title"><DiffOutlined /> 多次运行</div>
                    <div className="run-mode-desc">模型每次同时输出多条回复</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                   <Input 
                     prefix={<PictureOutlined style={{ color: '#9ca3af' }}/>} 
                     placeholder="图片 URL (可选)" 
                     value={picUrl} 
                     onChange={(e) => setPicUrl(e.target.value)} 
                     style={{ flex: 1 }}
                   />
                </div>

                <div className="run-controls">
                  <Text type="secondary" style={{ fontSize: 12 }}>内容由AI生成，无法确保真实准确，仅供参考。</Text>
                  <button 
                    className="run-button" 
                    onClick={callAiApi} 
                    disabled={Object.values(loadingModels).some(v => v)}
                  >
                    <SendOutlined /> 运行
                  </button>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {activeTab === 'batch' && (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="测试数据集 (JSON 数组)" bordered={false}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                配置一个包含多个测试对象的 JSON 数组。对象的 key 需与 Prompt 中的变量名 {"{{key}}"} 对应。
              </Text>
              <TextArea
                value={testDatasetStr}
                onChange={e => setTestDatasetStr(e.target.value)}
                autoSize={{ minRows: 6, maxRows: 15 }}
                style={{ fontFamily: 'monospace', background: '#f8fafc', padding: 12, borderRadius: 8 }}
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
              <Card title="测试结果与打分" bordered={false}>
                <Table 
                  dataSource={testResults} 
                  columns={getBatchTableColumns()} 
                  pagination={false}
                  bordered
                  scroll={{ x: 'max-content' }}
                  size="small"
                />
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* Legacy HTML to JSON Comparison Drawer */}
      <Drawer title="旧版工具：HTML 翻译与 JSON 对比" placement="right" onClose={() => setIsDrawerVisible(false)} open={isDrawerVisible} width={800}>
        <Row gutter={16}>
          <Col span={24} style={{ marginBottom: 16 }}>
            <Card title="输入待翻译 HTML" size="small">
              <TextArea value={translation} onChange={(e) => setTranslation(e.target.value)} autoSize={{ minRows: 4 }} />
              <Button type="primary" onClick={handleHtmlToJson} loading={htmlToJsonLoading} style={{ marginTop: 10 }} icon={<Html5Outlined />}>
                HTML -{">"} JSON
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
