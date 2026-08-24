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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
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
