import { useState, useEffect } from 'react';
import { getDocs } from '../services/api';

export default function DocsPage() {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await getDocs();
        setDocs(response);
      } catch {
        setDocs(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h2>API Documentation</h2>
        </div>
        <div className="page-body">
          <div className="loading-spinner"><div className="spinner"></div></div>
        </div>
      </>
    );
  }

  if (!docs) {
    return (
      <>
        <div className="page-header">
          <h2>API Documentation</h2>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <p>Failed to load API documentation.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h2>API Documentation</h2>
        <p>Version {docs.version} - Base URL: <code className="text-mono">{docs.baseUrl}</code></p>
      </div>
      <div className="page-body">
        <div className="card">
          {Object.entries(docs.endpoints).map(([key, endpoint]) => (
            <div key={key} className="docs-endpoint">
              <div>
                <span className={`docs-method ${endpoint.method.toLowerCase()}`}>
                  {endpoint.method}
                </span>
                <span className="docs-path">{endpoint.path}</span>
              </div>
              <p className="docs-description">{endpoint.description}</p>

              {endpoint.body && (
                <div className="docs-params">
                  <strong>Body:</strong>
                  {Object.entries(endpoint.body).map(([param, type]) => (
                    <div key={param} style={{ marginLeft: '12px' }}>
                      {param}: <span className="text-muted">{type}</span>
                    </div>
                  ))}
                </div>
              )}

              {endpoint.query && (
                <div className="docs-params">
                  <strong>Query:</strong>
                  {Object.entries(endpoint.query).map(([param, type]) => (
                    <div key={param} style={{ marginLeft: '12px' }}>
                      {param}: <span className="text-muted">{type}</span>
                    </div>
                  ))}
                </div>
              )}

              {endpoint.auth && (
                <div className="docs-params">
                  <strong>Auth:</strong> {endpoint.auth}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
