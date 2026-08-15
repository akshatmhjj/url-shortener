const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = `${API_URL}/api/v1`;

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

export async function getHealth() {
  return request(`${API_URL}/health`);
}