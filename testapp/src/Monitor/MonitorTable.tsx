import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './MonitorTable.css';

const MonitorTable: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://springbackendprod.azurewebsites.net'
        : 'https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net';
      const response = await axios.get(`${baseUrl}/monitorv2?includeFinish=false`);
      const formattedData = Object.entries(response.data).map(([key, value]: [string, any]) => {
        const initiTime = value.initEndTime && value.initStartTime ? value.initEndTime - value.initStartTime : null;
        const transTime = value.translateEndTime && value.initEndTime ? value.translateEndTime - value.initEndTime : null;
        const saveTime = value.savingShopifyEndTime && value.translateEndTime ? value.savingShopifyEndTime - value.translateEndTime : null;
        const lastUpdatedTime = value.savingShopifyEndTime ? Date.now() - value.savingShopifyEndTime : null;

        const shopName = value.shopName.replace(/\.myshopify\.com$/, '');

        return {
          taskId: `${key.split('-')[0]} - ${value.source} -> ${value.target}\n${shopName}`,
          totalCount: value.totalCount,
          translatedCount: value.translatedCount,
          savedCount: value.savedCount,
          usedToken: value.usedToken,
          translatedChars: value.translatedChars,
          initiTime: initiTime !== null ? formatTime(initiTime) : null,
          transTime: transTime !== null ? formatTime(transTime) : null,
          saveTime: saveTime !== null ? formatTime(saveTime) : null,
          lastUpdatedTime: lastUpdatedTime !== null ? formatTime(lastUpdatedTime) : null,
          status: value.status,
          sendEmail: value.send_email,
        };
      });
      setData(formattedData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusClass = (status: string) => {
    if (!status) return 'info';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('finish') || lowerStatus.includes('success') || lowerStatus.includes('done')) return 'success';
    if (lowerStatus.includes('error') || lowerStatus.includes('fail')) return 'error';
    if (lowerStatus.includes('process') || lowerStatus.includes('running')) return 'info';
    return 'warning';
  };

  if (loading && data.length === 0) {
    return (
      <div className="monitor-table-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading monitor data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="monitor-table-container">
      <div className="monitor-header">
        <h2>Monitor Dashboard</h2>
        <button className="refresh-button" onClick={fetchData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-wrapper">
        <table className="monitor-table">
          <thead>
            <tr>
              <th>任务ID</th>
              <th>总翻译数</th>
              <th>已翻译数</th>
              <th>写入数</th>
              <th>花费积分</th>
              <th>翻译长度</th>
              <th>初始化时间</th>
              <th>翻译时间</th>
              <th>保存时间</th>
              <th>上次更新</th>
              <th>状态</th>
              <th>邮件</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td className="task-id">{item.taskId}</td>
                <td>{item.totalCount}</td>
                <td>{item.translatedCount}</td>
                <td>{item.savedCount}</td>
                <td>{item.usedToken}</td>
                <td>{item.translatedChars}</td>
                <td>{item.initiTime || '-'}</td>
                <td>{item.transTime || '-'}</td>
                <td>{item.saveTime || '-'}</td>
                <td>{item.lastUpdatedTime || '-'}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td>{item.sendEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonitorTable;
