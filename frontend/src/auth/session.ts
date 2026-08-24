import type { UserRole } from './roles'

const STORAGE_KEY = 'perle-auth'

export type Session = {
  token: string
  role: UserRole
  email: string
  firstName: string
  lastName: string
  organisationName: string
  phone: string
  fonction: string
  matricule: string
  dateNaissance: string | null
  pays: string
  ville: string
}

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}
