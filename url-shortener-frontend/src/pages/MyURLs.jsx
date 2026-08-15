import { useOutletContext } from 'react-router-dom';
import URLTable from '../components/URLTable';

export default function MyURLs() {
  const { token, openLogin } = useOutletContext();

  return (
    <>
      <div className="page-header">
        <h2>My URLs</h2>
        <p>Manage your shortened URLs</p>
      </div>
      <div className="page-body">
        {token ? (
          <URLTable />
        ) : (
          <div className="card text-center py-12 px-6">
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Protected</h3>
              <p className="text-muted max-w-md mx-auto mt-2 mb-6">
                You must sign in with Google to view and manage your shortened URLs, view detailed real-time analytics, and delete active links.
              </p>
              <button className="btn btn-primary btn-lg" onClick={openLogin}>
                🔐 Sign In to Access
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
