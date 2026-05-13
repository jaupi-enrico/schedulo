import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api'

const AuthContext = createContext()

// ─────────────────────────────────────────────
//  PERSISTENZA
//  Salviamo solo un flag booleano in localStorage:
//  le credenziali restano solo nella sessione
//  server (cookie httpOnly), mai nel browser.
// ─────────────────────────────────────────────

const STORAGE_KEY = 'cv_logged'

function readStorage() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' }
  catch { return false }
}

function writeStorage(value) {
  try { localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false') }
  catch { /* storage non disponibile, ignoriamo */ }
}

function clearStorage() {
  try { localStorage.removeItem(STORAGE_KEY) }
  catch { /* ignoriamo */ }
}

// ─────────────────────────────────────────────
//  PROVIDER
// ─────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [logged,  setLogged]  = useState(false)
  const [loading, setLoading] = useState(true)   // true finché non verifichiamo la sessione
  const [error,   setError]   = useState(null)   // stringa di errore o null

  // Al mount: se localStorage dice "loggato", verifichiamo
  // che la sessione server sia ancora valida chiamando /api/profilo.
  // Se risponde 401 puliamo lo stato, altrimenti confermiamo il login.
  useEffect(() => {
    if (!readStorage()) {
      setLoading(false)
      return
    }

    api('/api/profilo')
      .then(() => setLogged(true))
      .catch(() => {
        clearStorage()
        setLogged(false)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (user, pass) => {
    setError(null)
    setLoading(true)

    try {
      await api('/api/login', {
        method: 'POST',
        body:   JSON.stringify({ user, pass })
      })
      writeStorage(true)
      setLogged(true)
    } catch (err) {
      setError(err.message ?? 'Errore durante il login')
      throw err   // propaga al form per eventuali gestioni locali
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      await api('/api/logout', { method: 'POST' })
    } catch {
      // Il logout lato server ha fallito, ma puliamo comunque lo stato locale
    } finally {
      clearStorage()
      setLogged(false)
      setLoading(false)
    }
  }, [])

  // Chiamato da qualsiasi parte dell'app quando il server risponde 401
  const onSessionExpired = useCallback(() => {
    clearStorage()
    setLogged(false)
    setError('Sessione scaduta, effettua di nuovo il login')
  }, [])

  return (
    <AuthContext.Provider value={{ logged, loading, error, login, logout, onSessionExpired, setError }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─────────────────────────────────────────────
//  HOOK
// ─────────────────────────────────────────────

export const useAuth = () => useContext(AuthContext)