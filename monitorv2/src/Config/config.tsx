import React, { useEffect, useState } from 'react';
import { httpGet, httpDelete, httpPut } from '../utils/HttpUtils';
import './config.css';

const Config: React.FC = () => {
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');

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
      await httpDelete('production', `/bogdaconfig?key=${encodeURIComponent(key)}`);
      await loadData();
    } catch (e: any) {
      setError(e?.message || '删除失败');
      setLoading(false);
    }
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
        `/bogdaconfig?key=${encodeURIComponent(newKey)}&value=${encodeURIComponent(newValue)}`,
        {}
      );
      setShowAddModal(false);
      setNewKey('');
      setNewValue('');
      await loadData();
    } catch (e: any) {
      setError(e?.message || '新增失败');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="config-page">
      <div className="config-reload">
        <button onClick={loadData} disabled={loading}>刷新配置</button>
        <button
          style={{ marginLeft: 8 }}
          onClick={() => setShowAddModal(true)}
          disabled={loading}
        >
          新增
        </button>
      </div>
      <div className="config-status">
        {loading && <span>加载中...</span>}
        {!loading && !error && (
          <span>共 {Object.keys(data).length} 项配置</span>
        )}
      </div>
      {error && <div className="config-error">{error}</div>}

      <table className="config-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(data).map((k) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{data[k]}</td>
              <td>
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

      {showAddModal && (
        <div className="config-modal-overlay">
          <div className="config-modal">
            <h3>新增配置</h3>
            <div className="config-modal-field">
              <label>Key：</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="config-modal-field">
              <label>Value：</label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="config-modal-actions">
              <button onClick={() => setShowAddModal(false)} disabled={loading}>
                取消
              </button>
              <button onClick={handleAdd} disabled={loading}>
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
