import { api } from './client'

export interface ClickByDay {
  date: string
  clicks: number
}

export interface PeakHour {
  hour: number
  clicks: number
}

export interface TopUrlEntry {
  shortCode: string
  originalUrl: string
  clicks: number
}

export interface ReferrerEntry {
  source: string
  clicks: number
}

export interface UniqueIpsEntry {
  shortCode: string
  uniqueVisitors: number
}

export interface UrlWithClicks {
  shortCode: string
  originalUrl: string
  createdAt: string
  expiresAt: string | null
  expired: boolean
  clicks: number
}

export interface DashboardResponse {
  summary: {
    totalUrls: number
    totalClicks: number
    clicksLast7Days: number
  }
  trends: {
    clicksByDay: ClickByDay[]
    peakHours: PeakHour[]
  }
  rankings: {
    topUrls: TopUrlEntry[]
    topReferrers: ReferrerEntry[]
    uniqueIpsPerUrl: UniqueIpsEntry[]
  }
  urls: UrlWithClicks[]
}

export function getDashboard(): Promise<DashboardResponse> {
  return api<DashboardResponse>('/api/dashboard')
}
