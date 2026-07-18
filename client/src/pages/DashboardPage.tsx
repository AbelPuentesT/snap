import { useEffect, useState, type FormEvent } from 'react'
import { getDashboard, type DashboardResponse } from '../api/dashboard'
import { createUrl } from '../api/urls'
import { ApiRequestError } from '../api/client'

const BASE_URL = 'http://localhost:3000'

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card" style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
        {value}
      </div>
    </div>
  )
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--bar-fill)', borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [url, setUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [ttl, setTtl] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createdShortCode, setCreatedShortCode] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      setData(await getDashboard())
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    setCreatedShortCode('')
    try {
      const ttlNum = ttl ? parseInt(ttl, 10) : undefined
      const result = await createUrl(url, alias.trim() || undefined, ttlNum)
      setUrl('')
      setAlias('')
      setTtl('')
      setCreatedShortCode(result.shortCode)
      await load()
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setCreateError(err.message)
      } else {
        setCreateError('Error de conexión con el servidor')
      }
    } finally {
      setCreating(false)
    }
  }

  function copyToClipboard(code: string) {
    void navigator.clipboard.writeText(`${BASE_URL}/${code}`)
  }

  if (loading && !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
      Cargando…
    </div>
  )

  if (error && !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', minHeight: 300, justifyContent: 'center' }}>
      <div className="alert-error">{error}</div>
      <button className="btn-ghost" onClick={load}>Reintentar</button>
    </div>
  )

  if (!data) return null

  const maxDaily = Math.max(1, ...data.trends.clicksByDay.map(d => d.clicks))
  const maxHourly = Math.max(1, ...data.trends.peakHours.map(h => h.clicks))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <StatCard title="URLs creadas" value={data.summary.totalUrls} />
        <StatCard title="Clicks totales" value={data.summary.totalClicks} />
        <StatCard title="Últimos 7 días" value={data.summary.clicksLast7Days} />
      </div>

      {/* Create URL */}
      <SectionCard title="Nueva URL corta">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="field">
            <label htmlFor="url">URL original</label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://ejemplo.com/url/muy/larga"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.85rem' }}>
            <div className="field">
              <label htmlFor="alias">
                Alias{' '}
                <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(opcional, 3-20 chars)</span>
              </label>
              <input
                id="alias"
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="mi-enlace"
              />
            </div>
            <div className="field">
              <label htmlFor="ttl">
                TTL{' '}
                <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(horas)</span>
              </label>
              <input
                id="ttl"
                type="number"
                min="1"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                placeholder="∞"
                style={{ width: 90 }}
              />
            </div>
          </div>

          {createError && <div className="alert-error">{createError}</div>}

          {createdShortCode && (
            <div className="alert-success">
              <span>✓ Creada:</span>
              <a
                href={`${BASE_URL}/${createdShortCode}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--success)' }}
              >
                {BASE_URL}/{createdShortCode}
              </a>
              <button
                type="button"
                className="btn-icon"
                style={{ marginLeft: 'auto', color: 'var(--success)', borderColor: 'rgba(34,197,94,0.3)' }}
                onClick={() => copyToClipboard(createdShortCode)}
              >
                Copiar
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={creating}
              style={{ width: 'auto', minWidth: 140 }}
            >
              {creating ? 'Creando…' : 'Crear URL corta'}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* URL table */}
      <SectionCard title={`Tus URLs${data.urls.length > 0 ? ` · ${data.urls.length}` : ''}`}>
        {data.urls.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Todavía no creaste ninguna URL corta.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Enlace corto</th>
                  <th>URL original</th>
                  <th>Creada</th>
                  <th style={{ textAlign: 'right' }}>Clicks</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.urls.map((u) => (
                  <tr key={u.shortCode} style={{ opacity: u.expired ? 0.45 : 1 }}>
                    <td>
                      <a
                        href={`${BASE_URL}/${u.shortCode}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: u.expired ? 'var(--text-subtle)' : 'var(--text)',
                          textDecoration: u.expired ? 'line-through' : 'underline',
                          textUnderlineOffset: 3,
                        }}
                      >
                        /{u.shortCode}
                      </a>
                    </td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {u.originalUrl}
                    </td>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {u.createdAt.slice(0, 10)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {u.clicks}
                    </td>
                    <td>
                      {u.expired ? (
                        <span className="badge badge-error">Expirada</span>
                      ) : u.expiresAt ? (
                        <span className="badge badge-success">
                          {new Date(u.expiresAt + 'Z').toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="badge badge-muted">∞</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        onClick={() => copyToClipboard(u.shortCode)}
                        title="Copiar enlace"
                      >
                        Copiar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Charts grid */}
      {(data.rankings.topUrls.length > 0 || data.trends.clicksByDay.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {data.rankings.topUrls.length > 0 && (
            <SectionCard title="Top URLs">
              {data.rankings.topUrls.map((u, i) => (
                <Bar
                  key={u.shortCode}
                  label={`#${i + 1} /${u.shortCode}`}
                  value={u.clicks}
                  max={data.rankings.topUrls[0].clicks}
                />
              ))}
            </SectionCard>
          )}
          {data.rankings.topReferrers.length > 0 && (
            <SectionCard title="Top referentes">
              {data.rankings.topReferrers.map((r) => (
                <Bar
                  key={r.source}
                  label={r.source}
                  value={r.clicks}
                  max={data.rankings.topReferrers[0].clicks}
                />
              ))}
            </SectionCard>
          )}
          {data.trends.clicksByDay.length > 0 && (
            <SectionCard title="Clicks por día (30d)">
              {data.trends.clicksByDay.map((d) => (
                <Bar key={d.date} label={d.date} value={d.clicks} max={maxDaily} />
              ))}
            </SectionCard>
          )}
          {data.trends.peakHours.length > 0 && (
            <SectionCard title="Horas pico">
              {data.trends.peakHours.map((h) => (
                <Bar
                  key={h.hour}
                  label={`${String(h.hour).padStart(2, '0')}:00`}
                  value={h.clicks}
                  max={maxHourly}
                />
              ))}
            </SectionCard>
          )}
        </div>
      )}
    </div>
  )
}
