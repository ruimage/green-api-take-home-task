export type GreenApiFetch = (url: string, init: RequestInit) => Promise<Response>;
export type GreenApiOptions = { apiUrl?: string; fetch?: GreenApiFetch; requestTimeoutMs?: number };
