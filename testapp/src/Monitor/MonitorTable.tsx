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

  useEffect(() => {
    const fetchData = async () => {
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
            taskId: `${key.split('-')[0]} - ${value.source} -> ${value.target} \n ${shopName}`,
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
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-indicator">Loading...</div>;
  }

  return (
    <div className="monitor-table-container">
      <h2>Monitor Table</h2>
      {error && <p className="error-message">{error}</p>}
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
              <td>{item.taskId}</td>
              <td>{item.totalCount}</td>
              <td>{item.translatedCount}</td>
              <td>{item.savedCount}</td>
              <td>{item.usedToken}</td>
              <td>{item.translatedChars}</td>
              <td>{item.initiTime || ''}</td>
              <td>{item.transTime || ''}</td>
              <td>{item.saveTime || ''}</td>
              <td>{item.lastUpdatedTime || ''}</td>
              <td>{item.status}</td>
              <td>{item.sendEmail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MonitorTable;
