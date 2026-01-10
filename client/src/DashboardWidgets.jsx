import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, Clock, Smartphone, Monitor, Activity, Globe } from 'lucide-react';

export const StatCard = ({ title, value, icon: Icon, footer, color = "#6b7280" }) => (
  <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div className="card-header">
      <span className="card-title">{title}</span>
      <Icon size={16} color={color} />
    </div>
    <div className="card-value">{value}</div>
    {footer && <div className="card-footer">{footer}</div>}
  </div>
);

export const TrafficChart = ({ data, themeColor, timeframe }) => (
  <div className="card" style={{ minHeight: '400px', height: '100%' }}>
    <div className="card-header">
      <h3 className="card-title" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
        {timeframe === 'minutes' ? 'Tráfego em Tempo Real' : 
         timeframe === 'hours' ? 'Tráfego: Últimas 24 Horas' : 
         'Tráfego: Últimos 7 Dias'}
      </h3>
      <Activity size={16} color="var(--text-secondary)" />
    </div>
    <div style={{ height: '320px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={themeColor} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tick={{fill: 'var(--text-secondary)'}}
          />
          <YAxis 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            allowDecimals={false}
            tick={{fill: 'var(--text-secondary)'}} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Area 
            type="monotone" 
            dataKey="users" 
            stroke={themeColor} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorUsers)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const DeviceChart = ({ data, colors, total }) => (
  <div className="card" style={{ height: '100%' }}>
    <div className="card-header">
      <h3 className="card-title" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Distribuição por Dispositivo</h3>
      <Smartphone size={16} color="var(--text-secondary)" />
    </div>
    <div style={{ height: '320px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Text Overlay */}
      <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{total}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total</div>
      </div>
    </div>
  </div>
);

export const TopPagesTable = ({ pages, totalOnline }) => (
  <div className="card" style={{ height: '100%' }}>
    <div className="card-header">
      <h3 className="card-title" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Páginas Mais Acessadas</h3>
      <Globe size={16} color="var(--text-secondary)" />
    </div>
    <table className="data-table">
      <thead>
        <tr>
          <th>URL da Página</th>
          <th style={{ textAlign: 'right' }}>Usuários</th>
          <th style={{ textAlign: 'right' }}>% do Total</th>
        </tr>
      </thead>
      <tbody>
        {pages.length === 0 ? (
          <tr>
            <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Nenhum dado disponível no momento
            </td>
          </tr>
        ) : (
          pages.map((page, index) => (
            <tr key={index}>
              <td style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                {page.url}
              </td>
              <td style={{ textAlign: 'right', color: '#10b981' }}>
                {page.count}
              </td>
              <td style={{ textAlign: 'right' }}>
                {totalOnline > 0 ? Math.round((page.count / totalOnline) * 100) : 0}%
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
