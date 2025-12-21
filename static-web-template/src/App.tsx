import React, { useMemo, useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  const now = useMemo(() => new Date().toLocaleString(), []);

  return (
    <div className="page">
      <header className="header">
        <h1 className="title">Vite + React 前端模板</h1>
        <p className="subtitle">可直接复制使用（TypeScript）。</p>
      </header>

      <main className="card">
        <p>启动时间：{now}</p>
        <p>计数：{count}</p>
        <div className="actions">
          <button onClick={() => setCount((c) => c + 1)}>+1</button>
          <button onClick={() => setCount(0)}>重置</button>
        </div>
        <p className="hint">编辑 <code>src/App.tsx</code> 即可开始开发。</p>
      </main>
    </div>
  );
}

