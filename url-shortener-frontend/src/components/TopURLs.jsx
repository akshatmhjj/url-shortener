import { useState, useEffect } from 'react';
import { getTopUrls } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function TopURLs() {
  const [urls, setUrls] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopUrls = async () => {
      setLoading(true);
      try {
        const response = await getTopUrls(4, period);
        setUrls(response.data || []);
      } catch {
        setUrls([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTopUrls();
  }, [period]);

  return (
    <div className="card">
      <div className="card-header">
        <h3>Top URLs</h3>
        <div className="period-selector">
          {['7d', '30d', '90d'].map((p) => (
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

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : urls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📈</div>
          <h3>No data yet</h3>
          <p>Shorten some URLs and start sharing them to see analytics here.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Short Code</th>
                <th>Original URL</th>
                <th>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((url, i) => (
                <tr
                  key={url.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/analytics/${url.short_code}`)}
                >
                  <td data-label="#" className="text-muted">{i + 1}</td>
                  <td data-label="Short Code" className="short-code-cell">{url.short_code}</td>
                  <td data-label="Original URL" className="url-cell">{url.original_url}</td>
                  <td data-label="Clicks"><strong>{Number(url.clicks).toLocaleString()}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
