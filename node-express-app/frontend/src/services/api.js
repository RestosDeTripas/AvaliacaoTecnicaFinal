const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getStoredToken = () => localStorage.getItem('token');

export const getAuthHeaders = (extraHeaders = {}) => {
  const token = getStoredToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
};

export const apiRequest = async (path, options = {}) => {
  const { method = 'GET', body, headers = {} } = options;
  const hasBody = body !== undefined && body !== null;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: getAuthHeaders(headers),
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = response.headers.get('content-type') || '';
  const isJsonResponse = contentType.includes('application/json');
  const data = response.status === 204 || !isJsonResponse ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error || data?.message || 'Não foi possível concluir a operação.';
    throw new Error(message);
  }

  return data;
};
