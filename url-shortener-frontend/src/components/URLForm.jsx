import { useState } from 'react';
import { shortenUrl } from '../services/api';
import { useToast } from './Toast';

export default function URLForm() {
  const addToast = useToast();
  const [formData, setFormData] = useState({
    url: '',
    custom_alias: '',
    title: '',
    ttl: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await shortenUrl(formData);
      setResult(response.data);
      setFormData({ url: '', custom_alias: '', title: '', ttl: '' });
      addToast('URL shortened successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to shorten URL', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      addToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3>Shorten a URL</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Destination URL *</label>
              <input
                type="url"
                className="form-input mono"
                placeholder="https://example.com/your/very/long/url/that/needs/shortening"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Custom Alias (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. mylink"
                  value={formData.custom_alias}
                  onChange={(e) => setFormData({ ...formData, custom_alias: e.target.value })}
                />
                <div className="form-hint">Alphanumeric, 3–50 characters</div>
              </div>

              <div className="form-group">
                <label className="form-label">Title (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Marketing Campaign"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Expiry (seconds, optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 86400 (24 hours). Min: 3600 (1 hour)"
                value={formData.ttl}
                onChange={(e) => setFormData({ ...formData, ttl: e.target.value })}
                min="3600"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !formData.url}>
              {loading ? 'Shortening...' : '⚡ Shorten URL'}
            </button>
          </form>
        </div>
      </div>

      {result && (
        <div className="url-result">
          <div className="url-result-label">Your shortened URL</div>
          <div className="url-result-row">
            <span className="url-result-link">{result.short_url}</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => copyToClipboard(result.short_url)}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <a
              href={`/analytics/${result.short_code}`}
              className="btn btn-ghost btn-sm"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = `/analytics/${result.short_code}`;
              }}
            >
              📊 Analytics
            </a>
          </div>

          <div className="url-result-meta">
            <div className="url-result-meta-item">
              Short Code: <span>{result.short_code}</span>
            </div>
            <div className="url-result-meta-item">
              Created: <span>{new Date(result.created_at).toLocaleString()}</span>
            </div>
            {result.expires_at && (
              <div className="url-result-meta-item">
                Expires: <span>{new Date(result.expires_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="qr-section">
            <img
              src={result.qr_code}
              alt="QR Code"
              className="qr-image"
              loading="lazy"
            />
            <div className="qr-info">
              <p>Scan this QR code to open the shortened URL.</p>
              <button
                className="btn btn-ghost btn-sm mt-4"
                onClick={() => copyToClipboard(result.qr_code)}
              >
                📋 Copy QR URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
