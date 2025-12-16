import React from 'react';
import { useNavigate } from 'react-router-dom';
import MonitorTable from "./Monitor/MonitorTable";

const App: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Welcome to Monitor111</h1>
      <button className="debug-prompt-button" onClick={() => navigate('/debug-prompt')}>
        调试 Prompt
      </button>
      <MonitorTable />
    </div>
  );
};

export default App;
