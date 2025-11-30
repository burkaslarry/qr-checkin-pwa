export const CONFIG = {
    // In development (Vite), we use the proxy defined in vite.config.ts
    // In production, this might need to point to the real backend URL
    API_BASE_URL: import.meta.env.PROD ? 'https://bni-anchor-checkin-backend.onrender.com' : 'http://localhost:8080'
};

export function getApiUrl(path: string): string {
    const base = CONFIG.API_BASE_URL;
    // Remove trailing slash if present
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    // Ensure path starts with slash
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
}

export function getWsUrl(): string {
    const base = CONFIG.API_BASE_URL;
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/records';
    return url.toString();
}

