import { getSession } from '../auth/session'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, payload: unknown, message: string) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

const authHeaders = (): Record<string, string> => {
  const token = getSession()?.token
  return token ? { Authorization: `Token ${token}` } : {}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...authHeaders(), ...options.headers },
    })
  } catch {
    throw new ApiError(0, null, 'Impossible de contacter le serveur.')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, payload, 'La requête a échoué.')
  return payload as T
}

export const apiGet = <T>(path: string): Promise<T> => request<T>(path)

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const apiPatch = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const apiDelete = (path: string): Promise<void> => request<void>(path, { method: 'DELETE' })

/* Pas de Content-Type explicite : le navigateur fixe lui-même la limite multipart. */
export const apiUpload = <T>(path: string, formData: FormData): Promise<T> =>
  request<T>(path, { method: 'PATCH', body: formData })

export const apiPostUpload = <T>(path: string, formData: FormData): Promise<T> =>
  request<T>(path, { method: 'POST', body: formData })
