export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://gateway-service-production-9201.up.railway.app'
    : 'http://127.0.0.1:3001')
).replace(/\/+$/, '');
