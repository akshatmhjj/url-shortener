import URLForm from '../components/URLForm';

export default function Dashboard() {
  return (
    <div className="dashboard-view">
      {/* Hero Branding Section */}
      <section className="hero-section">
        <div className="hero-badge">⚡ Next-Gen Link Management</div>
        <h2 className="hero-title">
          Shorten. Track. <span className="text-gradient">Secure.</span>
        </h2>
        <p className="hero-subtitle">
          Optimize your audience reach with lightning-fast links, real-time analytics, secure encrypted routing, and automated management.
        </p>
      </section>

      {/* Primary Action Panel (Shortening Form) */}
      <section className="dashboard-action-section">
        <URLForm />
      </section>

      {/* Features Grid & Value Proposition */}
      <section className="features-section mt-12">
        <h3 className="section-title text-center">Built for Speed and Security</h3>
        <p className="section-subtitle text-center">Experience link management designed for modern platforms.</p>

        <div className="features-grid mt-6">
          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h4>Easy Shortening</h4>
            <p>
              Paste any long website link and turn it into a short, clean link that is easy to share with anyone.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h4>Visitor Tracking</h4>
            <p>
              See how many times people click your short links and get details about where they are from.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h4>Safe & Secure</h4>
            <p>
              Keep your links safe. You can set them to stop working automatically after a certain amount of time.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h4>QR Codes</h4>
            <p>
              Get a free QR code for every link. People can scan it with their phone camera to open your page instantly.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✍️</div>
            <h4>Custom Names</h4>
            <p>
              Create custom names for your short links (like "mylink") so they are easy to say and remember.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h4>Device Info</h4>
            <p>
              Find out if visitors are viewing your links from mobile phones, tablets, or desktop computers.
            </p>
          </div>
        </div>
      </section>


    </div>
  );
}
