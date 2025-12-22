import React, { useEffect, useState } from 'react';
import { httpGet, httpDelete, httpPut } from '../utils/HttpUtils';
import './config.css';
import { useNavigate } from 'react-router-dom';

const Config: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [editingKey, setEditingKey] = useState<string | null>(null); // 当前正在更新的 key

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await httpGet('production', '/bogdaconfig');
      setData(res || {});
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(`确定要删除配置 ${key} 吗？`)) return;

    setLoading(true);
    setError(null);
    try {
      await httpDelete('production', `/bogdaconfig?key=${key}`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || '删除失败');
      setLoading(false);
    }
  };

  const openEdit = (key: string, value: string) => {
    // 复用新增弹窗，只是把 key 锁定为当前 key
    setEditingKey(key);
    setNewKey(key);
    setNewValue(value);
    setShowAddModal(true);
  };

  const handleAdd = async () => {
    if (!newKey.trim()) {
      alert('Key 不能为空');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await httpPut(
        'production',
        `/bogdaconfig?key=${newKey}&value=${newValue}`,
        {}
      );
      setShowAddModal(false);
      setEditingKey(null);
      setNewKey('');
      setNewValue('');
      await loadData();
    } catch (e: any) {
      setError(e?.message || (editingKey ? '更新失败' : '新增失败'));
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="config-page">
      <div className="config-header">
        <h2 className="config-title">系统配置中心</h2>
        <p className="config-subtitle">查看、新增和删除监控系统的运行时配置</p>
      </div>

      <div className="config-card">
        <div className="config-toolbar">
          <div className="config-actions">
            <button
              className="config-btn"
              onClick={() => navigate('/')}
              disabled={loading}
              style={{ marginRight: 8 }}
            >
              返回首页
            </button>
            <button className="config-btn primary" onClick={loadData} disabled={loading}>
              刷新配置
            </button>
            <button
              className="config-btn"
              style={{ marginLeft: 8 }}
              onClick={() => setShowAddModal(true)}
              disabled={loading}
            >
              新增配置
            </button>
          </div>
          <div className="config-status">
            {loading && <span className="config-status-loading">加载中...</span>}
            {!loading && !error && (
              <span className="config-status-count">共 {Object.keys(data).length} 项配置</span>
            )}
          </div>
        </div>

        {error && <div className="config-error">{error}</div>}

        {Object.keys(data).length === 0 && !loading && !error ? (
          <div className="config-empty">暂无配置，请点击右上角“新增配置”进行添加。</div>
        ) : (
          <div className="config-table-wrapper">
            <table className="config-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(data)
                  .sort()
                  .map((k) => (
                    <tr key={k}>
                      <td className="config-key-cell">{k}</td>
                      <td className="config-value-cell">{data[k]}</td>
                      <td className="config-ops-cell">
                        <button
                          className="config-edit-btn"
                          onClick={() => openEdit(k, data[k])}
                          disabled={loading}
                        >
                          更新
                        </button>
                        <button
                          className="config-delete-btn"
                          onClick={() => handleDelete(k)}
                          disabled={loading}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="config-modal-overlay">
          <div className="config-modal">
            <h3 className="config-modal-title">{editingKey ? '更新配置' : '新增配置'}</h3>
            <p className="config-modal-tip">建议使用有语义的 Key，Value 支持任意字符串。</p>
            <div className="config-modal-field">
              <label>Key：</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                disabled={loading || !!editingKey}
                placeholder="例如：feature.toggle.new_ui"
              />
            </div>
            <div className="config-modal-field">
              <label>Value：</label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                disabled={loading}
                placeholder="例如：true 或任意配置值"
              />
            </div>
            <div className="config-modal-actions">
              <button
                className="config-btn"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingKey(null);
                  setNewKey('');
                  setNewValue('');
                }}
                disabled={loading}
              >
                取消
              </button>
              <button className="config-btn primary" onClick={handleAdd} disabled={loading}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Config;
