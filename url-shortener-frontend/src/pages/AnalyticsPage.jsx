import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAnalytics } from '../services/api';
import StatsCard from '../components/StatsCard';
import { TimeSeriesChart, DeviceChart, ReferrerChart } from '../components/AnalyticsCharts';

export default function AnalyticsPage() {
  const { shortCode } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAnalytics(shortCode, period);
        setAnalytics(response.data);
      } catch (err) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [shortCode, period]);

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h2>Analytics Dashboard</h2>
        </div>
        <div className="page-body">
          <div className="loading-spinner"><div className="spinner"></div></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="page-header">
          <h2>Analytics Dashboard</h2>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  const { summary, geographic, referrers, devices, time_series } = analytics;
  const shortUrl = analytics.short_url || `${window.location.origin}/${shortCode}`;

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ width: '100%' }}>
          <div>
            <h2>Analytics Dashboard</h2>
            <p className="text-muted">Real-time click metrics and traffic insights</p>
          </div>
          <div className="period-selector">
            {['7d', '30d', '90d', '1y', 'all'].map((p) => (
              <button
                key={p}
                className={`period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Redesigned Hero Card */}
        <div className="analytics-hero-card">
          <div className="analytics-link-info">
            <span className="analytics-meta-label">Shortened URL</span>
            <div>
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="analytics-short-link"
              >
                {shortUrl} ↗
              </a>
            </div>
            <span className="analytics-meta-label" style={{ marginTop: '8px', display: 'block' }}>Destination URL</span>
            <div className="analytics-original-url" title={analytics.original_url}>
              {analytics.original_url}
            </div>
          </div>
          {/* <div className="analytics-meta-grid">
            <div className="analytics-meta-item">
              <span className="analytics-meta-label">Created At</span>
              <span className="analytics-meta-val">
                📅 {analytics.created_at ? new Date(analytics.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="analytics-meta-item">
              <span className="analytics-meta-label">Link Expiry</span>
              {analytics.expires_at ? (
                <span className="analytics-meta-val expiry-custom">
                  🕒 {new Date(analytics.expires_at).toLocaleString()}
                </span>
              ) : (
                <span className="analytics-meta-val expiry-default">
                  ♾️ Default (Permanent Link)
                </span>
              )}
            </div>
          </div> */}
        </div>

        {/* Stats cards */}
        <div className="stats-grid">
          <StatsCard
            label="Total Clicks"
            value={summary.total_clicks.toLocaleString()}
            accent
          />
          <StatsCard
            label="Unique Visitors"
            value={summary.unique_visitors.toLocaleString()}
          />
          <StatsCard
            label="Clicks Today"
            value={summary.clicks_today.toLocaleString()}
          />
          <StatsCard
            label="Last Clicked"
            value={summary.last_click ? new Date(summary.last_click).toLocaleDateString() : 'Never'}
            sub={summary.last_click ? new Date(summary.last_click).toLocaleTimeString() : null}
          />
        </div>

        {/* Charts */}
        <div className="charts-grid mt-6">
          <div className="card chart-full">
            <div className="card-header">
              <h3>Clicks Over Time</h3>
            </div>
            <div className="card-body">
              <TimeSeriesChart data={time_series} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Devices</h3>
            </div>
            <div className="card-body">
              <DeviceChart data={devices} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Top Referrers</h3>
            </div>
            <div className="card-body">
              <ReferrerChart data={referrers} />
            </div>
          </div>
        </div>

        {/* Countries table with progress visualization */}
        {geographic.countries && geographic.countries.length > 0 && (
          <div className="card mt-6">
            <div className="card-header">
              <h3>Countries</h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Country Code</th>
                    <th>Clicks</th>
                    <th>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {geographic.countries.map((c) => {
                    const totalCountryClicks = geographic.countries.reduce((sum, item) => sum + item.clicks, 0);
                    const percentage = totalCountryClicks > 0 ? (c.clicks / totalCountryClicks) * 100 : 0;
                    return (
                      <tr key={c.code}>
                        <td data-label="Country Code" style={{ fontWeight: 600 }}>{c.code}</td>
                        <td data-label="Clicks">{c.clicks.toLocaleString()}</td>
                        <td data-label="Distribution">
                          <div className="country-progress-row">
                            <div className="country-progress-bar-container">
                              <div
                                className="country-progress-bar-fill"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', minWidth: '32px', textAlign: 'right' }}>
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
