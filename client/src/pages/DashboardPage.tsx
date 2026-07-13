import { useEffect, useState, type FormEvent } from 'react'
import { getDashboard, type DashboardResponse } from '../api/dashboard'
import { createUrl } from '../api/urls'
import { ApiRequestError } from '../api/client'

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: '0.75rem', color: '#666' }}>{label}</div>
      <div
        style={{
          height: 12,
          background: '#eee',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: '#4a90d9',
            borderRadius: 4,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <div style={{ fontSize: '0.7rem', color: '#999', textAlign: 'right' }}>
        {value}
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div
      style={{
        background: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: '1rem',
        textAlign: 'center',
        flex: 1,
      }}
    >
      <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{value}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  boxSizing: 'border-box',
}

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
    getDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function loadDashboard() {
    try {
      const d = await getDashboard()
      setData(d)
    } catch (err) {
      setError((err as Error).message)
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
      await loadDashboard()
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

  if (loading) return <p>Cargando dashboard…</p>
  if (error)
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={loadDashboard}>Reintentar</button>
      </div>
    )
  if (!data) return null

  const maxDailyClicks = Math.max(
    1,
    ...data.trends.clicksByDay.map((d) => d.clicks),
  )
  const maxHourlyClicks = Math.max(
    1,
    ...data.trends.peakHours.map((h) => h.clicks),
  )

  return (
    <div>
      <h2>Dashboard</h2>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <Card title="URLs creadas" value={data.summary.totalUrls} />
        <Card title="Clicks totales" value={data.summary.totalClicks} />
        <Card title="Últimos 7 días" value={data.summary.clicksLast7Days} />
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Crear URL corta</h3>
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="url">URL original</label>
            <br />
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://ejemplo.com/muy/larga"
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="alias">
              Alias{' '}
              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                (opcional, 3-20 caracteres)
              </span>
            </label>
            <br />
            <input
              id="alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="mi-enlace"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="ttl">
              TTL (horas){' '}
              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                (vacío = sin expiración)
              </span>
            </label>
            <br />
            <input
              id="ttl"
              type="number"
              min="1"
              value={ttl}
              onChange={(e) => setTtl(e.target.value)}
              placeholder="24"
              style={{ ...inputStyle, width: 120 }}
            />
          </div>
          {createError && (
            <p style={{ color: 'red', marginBottom: '0.5rem' }}>
              {createError}
            </p>
          )}
          {createdShortCode && (
            <p style={{ color: 'green', marginBottom: '0.5rem' }}>
              Creada: /{createdShortCode}
            </p>
          )}
          <button type="submit" disabled={creating}>
            {creating ? 'Creando…' : 'Crear URL corta'}
          </button>
        </form>
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Tus URLs</h3>
        {data.urls.length === 0 ? (
          <p style={{ color: '#888' }}>
            Todavía no creaste ninguna URL corta.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '0.5rem' }}>Código</th>
                <th style={{ padding: '0.5rem' }}>URL original</th>
                <th style={{ padding: '0.5rem' }}>Creada</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>
                  Clicks
                </th>
                <th style={{ padding: '0.5rem' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.urls.map((u) => (
                <tr
                  key={u.shortCode}
                  style={{
                    borderBottom: '1px solid #eee',
                    opacity: u.expired ? 0.5 : 1,
                  }}
                >
                  <td style={{ padding: '0.5rem' }}>
                    <code>{u.shortCode}</code>
                  </td>
                  <td
                    style={{
                      padding: '0.5rem',
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      ...(u.expired ? { textDecoration: 'line-through', color: '#999' } : {}),
                    }}
                  >
                    {u.originalUrl}
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                    {u.createdAt}
                  </td>
                  <td
                    style={{
                      padding: '0.5rem',
                      textAlign: 'right',
                      fontWeight: 'bold',
                    }}
                  >
                    {u.clicks}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {u.expired ? (
                      <span
                        style={{
                          background: '#fcc',
                          color: '#a00',
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 'bold',
                        }}
                      >
                        Expirada
                      </span>
                    ) : u.expiresAt ? (
                      <span
                        style={{
                          background: '#efe',
                          color: '#070',
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {new Date(u.expiresAt).toLocaleString()}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#888',
                        }}
                      >
                        Sin expiración
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.rankings.topUrls.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '1rem',
            }}
          >
            <h4 style={{ marginTop: 0 }}>Top URLs</h4>
            {data.rankings.topUrls.map((u, i) => (
              <Bar
                key={u.shortCode}
                label={`#${i + 1} /${u.shortCode}`}
                value={u.clicks}
                max={data.rankings.topUrls[0].clicks}
              />
            ))}
          </div>
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '1rem',
            }}
          >
            <h4 style={{ marginTop: 0 }}>Top referentes</h4>
            {data.rankings.topReferrers.map((r) => (
              <Bar
                key={r.source}
                label={r.source}
                value={r.clicks}
                max={data.rankings.topReferrers[0].clicks}
              />
            ))}
          </div>
        </div>
      )}

      {data.trends.clicksByDay.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '1rem',
            }}
          >
            <h4 style={{ marginTop: 0 }}>Clicks por día (30d)</h4>
            {data.trends.clicksByDay.map((d) => (
              <Bar
                key={d.date}
                label={d.date}
                value={d.clicks}
                max={maxDailyClicks}
              />
            ))}
          </div>
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '1rem',
            }}
          >
            <h4 style={{ marginTop: 0 }}>Horas pico</h4>
            {data.trends.peakHours.map((h) => (
              <Bar
                key={h.hour}
                label={`${String(h.hour).padStart(2, '0')}:00`}
                value={h.clicks}
                max={maxHourlyClicks}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
