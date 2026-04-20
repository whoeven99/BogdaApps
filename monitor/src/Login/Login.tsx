
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, message } from 'antd';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('isAuthenticated', 'true');
        message.success('登录成功');
        navigate('/');
      } else {
        message.error(data.message || '账号或密码错误');
      }
    } catch (error) {
      message.error('登录请求失败');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>monitor登录</h1>
        <Input
          placeholder="账号"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onPressEnter={handleLogin}
        />
        <Input.Password
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleLogin}
        />
        <Button type="primary" onClick={handleLogin} loading={loading} block>
          登录
        </Button>
      </div>
    </div>
  );
};

export default Login;
