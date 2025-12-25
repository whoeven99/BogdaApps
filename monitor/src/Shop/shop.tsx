import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpGet } from '../utils/HttpUtils';

type TablesMap = Record<string, unknown>;

type Env = 'production' | 'development';

type Row = Record<string, unknown>;

const DataTable: React.FC<{ rows: Row[] }> = ({ rows }) => {
  const [hoverRowIndex, setHoverRowIndex] = useState<number | null>(null);

  const columns = useMemo(() => {
    return Array.from(
      rows.reduce((set, r) => {
        Object.keys(r).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );
  }, [rows]);

  return (
    <div
      style={{
        overflowX: 'auto',
        border: '1px solid #eef2f7',
        borderRadius: 12,
        background: '#fff',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  whiteSpace: 'nowrap',
                  background: '#f8fafc',
                  borderBottom: '1px solid #eef2f7',
                  fontWeight: 600,
                  color: '#334155',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isHover = hoverRowIndex === idx;
            const baseBg = idx % 2 === 0 ? '#fff' : '#fbfdff';
            const hoverBg = '#eff6ff';

            return (
              <tr
                key={idx}
                onMouseEnter={() => setHoverRowIndex(idx)}
                onMouseLeave={() => setHoverRowIndex(null)}
                style={{
                  background: isHover ? hoverBg : baseBg,
                  transition: 'background-color 120ms ease',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      padding: '10px 12px',
                      color: '#0f172a',
                      verticalAlign: 'top',
                      maxWidth: 420,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const Shop: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TablesMap>({});

  const [shopName, setShopName] = useState<string>('ciwishop.myshopify.com');

  const env: Env = useMemo(() => {
    return process.env.NODE_ENV === 'production' ? 'production' : 'development';
  }, []);

  const fetchTables = useCallback(async () => {
    const trimmed = shopName.trim();
    if (!trimmed) {
      setError('请输入商店名称');
      setTables({});
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = `/getTable?shopName=${encodeURIComponent(trimmed)}`;
      const data = (await httpGet(env, url)) as TablesMap;
      setTables(data ?? {});
    } catch (e: any) {
      setError(e?.message ?? '请求失败');
      setTables({});
    } finally {
      setLoading(false);
    }
  }, [env, shopName]);

  const renderTableContent = (content: unknown) => {
    if (Array.isArray(content) && content.length > 0 && content.every((r) => r && typeof r === 'object')) {
      return <DataTable rows={content as Row[]} />;
    }

    // 非标准表格结构，直接 JSON 展示
    return (
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          fontSize: 12,
          lineHeight: 1.5,
          background: '#0b1220',
          color: '#e5e7eb',
          padding: 12,
          borderRadius: 12,
          border: '1px solid #0f172a',
        }}
      >
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  };

  const tableEntries = Object.entries(tables ?? {});

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 60%)',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div
          style={{
            border: '1px solid #e5e7eb',
            background: '#ffffffcc',
            backdropFilter: 'blur(6px)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 14,
            boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>商店数据</h2>
              <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>
                输入 Shopify 店铺域名，查看后端返回的表数据
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  try {
                    navigate('/');
                  } catch {
                    window.location.href = '/';
                  }
                }}
                style={{
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                返回首页
              </button>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#475569', fontSize: 13 }}>商店名称</span>
                <input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="例如：ciwishop.myshopify.com"
                  style={{
                    minWidth: 320,
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    outline: 'none',
                    boxShadow: 'inset 0 1px 2px rgba(16,24,40,0.06)',
                  }}
                />
              </label>

              <button
                onClick={fetchTables}
                disabled={loading}
                style={{
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1px solid #1d4ed8',
                  background: loading ? '#93c5fd' : '#2563eb',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 16px rgba(37,99,235,0.18)',
                }}
              >
                {loading ? '加载中...' : '查看商店'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              border: '1px solid #fecaca',
              background: '#fff1f2',
              color: '#9f1239',
              padding: '10px 12px',
              borderRadius: 12,
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && tableEntries.length === 0 && (
          <div
            style={{
              border: '1px dashed #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              padding: 16,
              borderRadius: 16,
            }}
          >
            暂无数据
          </div>
        )}

        {tableEntries.map(([tableName, tableContent]) => (
          <section
            key={tableName}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
              background: '#fff',
              boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>{tableName}</h3>
              <span
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: '4px 8px',
                  borderRadius: 999,
                }}
              >
                {Array.isArray(tableContent) ? `${tableContent.length} 行` : 'JSON'}
              </span>
            </div>
            {renderTableContent(tableContent)}
          </section>
        ))}
      </div>
    </div>
  );
};

export default Shop;
