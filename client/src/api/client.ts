export class ApiRequestError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('snap_token')
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['authorization'] = `Bearer ${token}`
  }

  const res = await fetch(path, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('snap_token')
    localStorage.removeItem('snap_user')
    window.location.hash = '/login'
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Error desconocido' })) as { error?: string }
    throw new ApiRequestError(body.error ?? 'Error desconocido', res.status)
  }

  return res.json() as Promise<T>
}
