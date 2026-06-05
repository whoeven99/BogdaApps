import React from 'react';
import { useApi } from '../hooks/useApi';

export default function Flows() {
  const { data: flows, loading, error } = useApi('/api/admin/flows');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Flows List</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {flows && flows.map(flow => (
            <tr key={flow.id}>
              <td>{flow.id}</td>
              <td>{flow.name}</td>
              <td>{flow.type}</td>
              <td>{flow.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
