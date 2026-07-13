import { api } from './client'

export interface UrlEntry {
  shortCode: string
  originalUrl: string
  createdAt: string
}

export interface CreateUrlResponse {
  shortCode: string
  originalUrl: string
  expiresAt: string | null
}

export function listUrls(): Promise<UrlEntry[]> {
  return api<UrlEntry[]>('/api/urls')
}

export function createUrl(
  url: string,
  alias?: string,
  ttl?: number,
): Promise<CreateUrlResponse> {
  return api<CreateUrlResponse>('/api/urls', {
    method: 'POST',
    body: JSON.stringify({ url, ...(alias ? { alias } : {}), ...(ttl ? { ttl } : {}) }),
  })
}
