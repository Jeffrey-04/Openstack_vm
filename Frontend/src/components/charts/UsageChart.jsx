import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function UsageChart({ data = [], dataKeys = [], title = 'Utilisation', height = 260 }) {
  if (!dataKeys.length) dataKeys = [{ key: 'value', color: '#667eea', name: 'Valeur' }];
  return (
    <div className="usage-chart-container" style={{ width: '100%', height }}>
      {title && <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{title}</h3>}
      <ResponsiveContainer width="100%" height={height - 30}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {dataKeys.map(({ key, color, name }) => (
            <Line key={key} type="monotone" dataKey={key} stroke={color || '#667eea'} name={name || key} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarUsageChart({ data = [], dataKey = 'value', name = 'Valeur', color = '#667eea', title, height = 200 }) {
  return (
    <div className="bar-usage-chart" style={{ width: '100%', height }}>
      {title && <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{title}</h3>}
      <ResponsiveContainer width="100%" height={height - 30}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
