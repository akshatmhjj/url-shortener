import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#34d399', '#fbbf24', '#f87171'];

const tooltipStyle = {
  backgroundColor: '#1c1f2e',
  border: '1px solid #2a2e3f',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e8eaed',
};

export function TimeSeriesChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="empty-state"><p className="text-muted">No click data available</p></div>;
  }

  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3f" />
          <XAxis dataKey="date" stroke="#636882" fontSize={11} />
          <YAxis stroke="#636882" fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="clicks"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', r: 3 }}
            activeDot={{ r: 5, fill: '#818cf8' }}
            name="Clicks"
          />
          <Line
            type="monotone"
            dataKey="uniqueVisitors"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ fill: '#34d399', r: 3 }}
            strokeDasharray="5 5"
            name="Unique Visitors"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeviceChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="empty-state"><p className="text-muted">No device data</p></div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="clicks"
            nameKey="type"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={3}
            label={({ type, clicks }) => `${type} (${clicks})`}
            labelLine={{ stroke: '#636882' }}
            fontSize={11}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReferrerChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="empty-state"><p className="text-muted">No referrer data</p></div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3f" />
          <XAxis type="number" stroke="#636882" fontSize={11} />
          <YAxis
            dataKey="referrer"
            type="category"
            stroke="#636882"
            fontSize={11}
            width={80}
            tickFormatter={(val) => val.length > 20 ? val.slice(0, 18) + '…' : val}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="clicks" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
