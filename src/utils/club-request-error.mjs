// Preserve the backend's safe business validation messages for Club 4xx errors.
// Do not expose server stack traces or response bodies on 5xx/network errors.
export function clubRequestErrorMessage(error) {
  const status = error?.response?.status;
  const url = String(error?.config?.url || '');
  if (!url.startsWith('/club/') || ![400, 403, 409, 422].includes(status)) return '';
  const data = error.response.data;
  const message = data && (data.msg || data.message);
  return typeof message === 'string' && message.trim() ? message.trim().slice(0, 300) : '';
}
