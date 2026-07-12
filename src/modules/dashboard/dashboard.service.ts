import { getDb } from '../../shared/db.js'

interface ClickByDay {
  date: string
  clicks: number
}

interface PeakHour {
  hour: number
  clicks: number
}

interface UrlEntry {
  shortCode: string
  originalUrl: string
  createdAt: string
  clicks: number
}

interface TopUrlEntry {
  shortCode: string
  originalUrl: string
  clicks: number
}

interface ReferrerEntry {
  source: string
  clicks: number
}

interface UniqueIpsEntry {
  shortCode: string
  uniqueVisitors: number
}

interface DashboardResponse {
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
  urls: UrlEntry[]
}

export function getDashboard(userId: number): DashboardResponse {
  const db = getDb()

  return {
    summary: getSummary(db, userId),
    trends: getTrends(db, userId),
    rankings: getRankings(db, userId),
    urls: getUrlList(db, userId),
  }
}

function getSummary(
  db: ReturnType<typeof getDb>,
  userId: number,
): DashboardResponse['summary'] {
  const totalUrls = (
    db.prepare('SELECT COUNT(*) AS count FROM urls WHERE user_id = ?').get(userId) as { count: number }
  ).count

  const totalClicks = (
    db.prepare(`
      SELECT COUNT(c.id) AS count
      FROM clicks c
      JOIN urls u ON u.id = c.url_id
      WHERE u.user_id = ?
    `).get(userId) as { count: number }
  ).count

  const clicksLast7Days = (
    db.prepare(`
      SELECT COUNT(c.id) AS count
      FROM clicks c
      JOIN urls u ON u.id = c.url_id
      WHERE u.user_id = ?
        AND c.clicked_at >= datetime('now', '-7 days')
    `).get(userId) as { count: number }
  ).count

  return { totalUrls, totalClicks, clicksLast7Days }
}

function getTrends(
  db: ReturnType<typeof getDb>,
  userId: number,
): DashboardResponse['trends'] {
  const clicksByDay = db.prepare(`
    SELECT date(c.clicked_at) AS date, COUNT(*) AS clicks
    FROM clicks c
    JOIN urls u ON u.id = c.url_id
    WHERE u.user_id = ?
      AND c.clicked_at >= datetime('now', '-30 days')
    GROUP BY date(c.clicked_at)
    ORDER BY date ASC
  `).all(userId) as ClickByDay[]

  const peakHours = db.prepare(`
    SELECT CAST(strftime('%H', c.clicked_at) AS INTEGER) AS hour, COUNT(*) AS clicks
    FROM clicks c
    JOIN urls u ON u.id = c.url_id
    WHERE u.user_id = ?
    GROUP BY hour
    ORDER BY clicks DESC
  `).all(userId) as PeakHour[]

  return { clicksByDay, peakHours }
}

function getRankings(
  db: ReturnType<typeof getDb>,
  userId: number,
): DashboardResponse['rankings'] {
  const topUrls = (db.prepare(`
    SELECT u.short_code, u.original_url, COUNT(c.id) AS clicks
    FROM urls u
    LEFT JOIN clicks c ON c.url_id = u.id
    WHERE u.user_id = ?
    GROUP BY u.id
    ORDER BY clicks DESC
    LIMIT 10
  `).all(userId) as Array<Record<string, unknown>>).map((r) => ({
    shortCode: r['short_code'] as string,
    originalUrl: r['original_url'] as string,
    clicks: r['clicks'] as number,
  }))

  const topReferrers = db.prepare(`
    SELECT
      CASE WHEN c.referer IS NULL OR c.referer = '' THEN 'direct'
           ELSE c.referer
      END AS source,
      COUNT(*) AS clicks
    FROM clicks c
    JOIN urls u ON u.id = c.url_id
    WHERE u.user_id = ?
    GROUP BY source
    ORDER BY clicks DESC
    LIMIT 10
  `).all(userId) as ReferrerEntry[]

  const uniqueIpsPerUrl = (db.prepare(`
    SELECT u.short_code, COUNT(DISTINCT c.ip_address) AS unique_visitors
    FROM urls u
    LEFT JOIN clicks c ON c.url_id = u.id
    WHERE u.user_id = ?
    GROUP BY u.id
    ORDER BY unique_visitors DESC
    LIMIT 10
  `).all(userId) as Array<Record<string, unknown>>).map((r) => ({
    shortCode: r['short_code'] as string,
    uniqueVisitors: r['unique_visitors'] as number,
  }))

  return { topUrls, topReferrers, uniqueIpsPerUrl }
}

function getUrlList(
  db: ReturnType<typeof getDb>,
  userId: number,
): UrlEntry[] {
  return (db.prepare(`
    SELECT u.short_code, u.original_url, u.created_at, COUNT(c.id) AS clicks
    FROM urls u
    LEFT JOIN clicks c ON c.url_id = u.id
    WHERE u.user_id = ?
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all(userId) as Array<Record<string, unknown>>).map((r) => ({
    shortCode: r['short_code'] as string,
    originalUrl: r['original_url'] as string,
    createdAt: r['created_at'] as string,
    clicks: r['clicks'] as number,
  }))
}
