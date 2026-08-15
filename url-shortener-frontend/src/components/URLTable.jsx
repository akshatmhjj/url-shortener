import { useState, useEffect, useCallback } from 'react';
import { getUserUrls, deleteUrl } from '../services/api';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';

export default function URLTable() {
  const addToast = useToast();
  const navigate = useNavigate();
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ limit: 8, offset: 0, total: 0 });

  const fetchUrls = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const response = await getUserUrls(8, offset);
      setUrls(response.data || []);
      // Sync total records with response metadata, or count items if not present
      const totalCount = response.pagination?.total || response.data?.length || 0;
      setPagination(response.pagination || { limit: 8, offset, total: totalCount });
    } catch (err) {
      if (err.status !== 401) {
        addToast('Failed to load URLs', 'error');
      }
      setUrls([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUrls(0);
  }, []);

  const handleDelete = async (id, shortCode) => {
    if (!confirm(`Delete /${shortCode}? This cannot be undone.`)) return;

    try {
      await deleteUrl(id);
      addToast(`/${shortCode} deleted`, 'success');
      fetchUrls(pagination.offset);
    } catch {
      addToast('Failed to delete URL', 'error');
    }
  };

  const copyUrl = async (shortCode) => {
    const url = `${window.location.origin}/${shortCode}`;
    try {
      await navigator.clipboard.writeText(url);
      addToast('Copied!', 'success');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  if (loading) {
    return (
      <div className="card">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (urls.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">🔗</div>
          <h3>No URLs found</h3>
          <p>URLs created with your account will appear here. Go to the Dashboard to shorten a URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Short Code</th>
              <th>Original URL</th>
              <th>Title</th>
              <th>Created</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {urls.map((url) => {
              const isExpired = url.expires_at && new Date(url.expires_at) < new Date();
              const status = !url.is_active ? 'inactive' : isExpired ? 'expired' : 'active';

              return (
                <tr key={url.id}>
                  <td data-label="Short Code" className="short-code-cell">{url.short_code}</td>
                  <td data-label="Original URL" className="url-cell" title={url.original_url}>{url.original_url}</td>
                  <td data-label="Title" className="text-sm">{url.title || '—'}</td>
                  <td data-label="Created" className="text-sm text-muted">
                    {new Date(url.created_at).toLocaleDateString()}
                  </td>
                  <td data-label="Status">
                    <span className={`badge badge-${status}`}>
                      {status}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="actions-cell">
                      <button className="btn btn-ghost btn-sm" onClick={() => copyUrl(url.short_code)} title="Copy URL">
                        📋
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/analytics/${url.short_code}`)} title="Analytics">
                        📊
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(url.id, url.short_code)} title="Delete">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage <= 1}
              onClick={() => fetchUrls(pagination.offset - pagination.limit)}
            >
              ← Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => fetchUrls(pagination.offset + pagination.limit)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
