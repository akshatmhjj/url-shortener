const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

async function request(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, config);

  if (response.status === 204) {
    return { success: true };
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// URL Shortening
export async function shortenUrl({ url, custom_alias, title, ttl }) {
  const body = { url };
  if (custom_alias) body.custom_alias = custom_alias;
  if (title) body.title = title;
  if (ttl) body.ttl = Number(ttl);

  return request(`${API_BASE}/shorten`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Analytics
export async function getAnalytics(shortCode, period = '30d') {
  return request(`${API_BASE}/analytics/${shortCode}?period=${period}`);
}

export async function getTopUrls(limit = 10, period = '30d') {
  return request(`${API_BASE}/analytics/top/urls?limit=${limit}&period=${period}`);
}

// URL Management (authenticated)
export async function getUserUrls(limit = 20, offset = 0) {
  return request(`${API_BASE}/urls?limit=${limit}&offset=${offset}`);
}

export async function deleteUrl(id) {
  return request(`${API_BASE}/urls/${id}`, {
    method: 'DELETE',
  });
}

// Auth Services
export async function loginWithGoogle(idToken) {
  return request(`${API_BASE}/auth/google`, {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

// Health Check
export async function getHealth() {
  return request('/health');
}

// API Docs
export async function getDocs() {
  return request(`${API_BASE}/docs`);
}
