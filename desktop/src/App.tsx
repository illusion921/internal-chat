import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Main from './pages/Main';
import Login from './pages/Login';
import { useAuthStore } from './stores/authStore';
import './App.css';

const App: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <ConfigProvider locale={zhCN}>
      <div className="app">
        {user ? <Main /> : <Login />}
      </div>
    </ConfigProvider>
  );
};

export default App;