export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://gateway-service-production-b6bc64ad.up.railway.app'
    : 'http://127.0.0.1:3001')
).replace(/\/+$/, '');
