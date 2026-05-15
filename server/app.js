require('dotenv').config()

const express    = require('express')
const cors       = require('cors')
const session    = require('express-session')
const lusca      = require('lusca')
const ClasseViva = require('./Classeviva')   // export diretto: module.exports = ClasseViva

const app = express()
app.set('trust proxy', 1)

// ─────────────────────────────────────────────
//  LOGGING
// ─────────────────────────────────────────────

function log(level, ...args) {
  const ts     = new Date().toISOString()
  const prefix = { info: '📘', warn: '⚠️ ', error: '❌' }[level] ?? '  '
  console[level === 'error' ? 'error' : 'log'](`[${ts}] ${prefix}`, ...args)
}

function logReq(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    const ms    = Date.now() - start
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'
    log('info', `${color}${req.method} ${req.path} → ${res.statusCode}\x1b[0m (${ms}ms)`)
  })
  next()
}

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json())
app.use(logReq)

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET environment variable is required in production')
}

app.use(session({
  secret:            sessionSecret || 'il-gatto-di-mia-nonna-non-esiste',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   1000 * 60 * 60 * 2   // 2 ore
  }
}))
app.use(lusca.csrf())

// ─────────────────────────────────────────────
//  CACHE SESSIONE CLASSEVIVA
//
//  Il PHPSESSID di ClasseViva viene salvato in
//  req.session.cvSessionId: ogni request riusa la
//  sessione esistente senza rifare il login HTTP.
// ─────────────────────────────────────────────

async function getCV(req) {
  const { user, pass, cvSessionId } = req.session
  if (!user || !pass) return null

  if (cvSessionId) {
    log('info', `Riuso sessione CV cached per ${user}`)
    const cv = new ClasseViva(user, pass)
    cv.sessionid = cvSessionId
    return cv
  }

  log('info', `Nessuna sessione cached, nuovo login per ${user}`)
  const cv = new ClasseViva(user, pass)
  await cv.login()
  req.session.cvSessionId = cv.sessionid
  return cv
}

async function requireCV(req, res, next) {
  try {
    const cv = await getCV(req)
    if (!cv) return res.status(401).json({ errore: 'Non autenticato' })
    req.cv = cv
    next()
  } catch (err) {
    log('error', 'requireCV:', err.message)
    req.session.cvSessionId = null
    res.status(401).json({ errore: 'Sessione ClasseViva scaduta, effettua di nuovo il login' })
  }
}

// Wrapper async: centralizza try/catch e risposta JSON
function handler(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req, res)
      if (data !== undefined) res.json(data)
    } catch (err) {
      log('error', `${req.method} ${req.path}:`, err.message)

      if (/scadut|expired|session/i.test(err.message)) {
        req.session.cvSessionId = null
        return res.status(401).json({ errore: 'Sessione scaduta, effettua di nuovo il login' })
      }

      res.status(500).json({ errore: 'Errore interno del server', dettaglio: err.message })
    }
  }
}

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

app.post('/api/login', handler(async (req, res) => {
  const { user, pass } = req.body
  if (!user || !pass) {
    res.status(400).json({ errore: 'Credenziali mancanti' })
    return
  }

  log('info', `Tentativo login per: ${user}`)
  const cv = await ClasseViva.establishSession(user, pass)

  req.session.user        = user
  req.session.pass        = pass
  req.session.cvSessionId = cv.sessionid

  log('info', `Login riuscito per: ${user}`)
  res.json({ ok: true })
}))

app.post('/api/logout', (req, res) => {
  const user = req.session.user ?? 'sconosciuto'
  req.session.destroy(err => {
    if (err) {
      log('error', 'Logout:', err.message)
      return res.status(500).json({ errore: 'Errore durante il logout' })
    }
    log('info', `Logout: ${user}`)
    res.json({ ok: true })
  })
})

// ─────────────────────────────────────────────
//  ROUTE PROTETTE
// ─────────────────────────────────────────────

app.get('/api/profilo',   requireCV, handler(req => req.cv.getProfile()))
app.get('/api/voti',      requireCV, handler(req => req.cv.getGrades()))
app.get('/api/assenze',   requireCV, handler(req => req.cv.getAbsences()))
app.get('/api/ritardi',   requireCV, handler(req => req.cv.getDelays()))
app.get('/api/note',      requireCV, handler(req => req.cv.getNotes()))
app.get('/api/argomenti', requireCV, handler(req => req.cv.getLessons()))
app.get('/api/compiti',   requireCV, handler(req => req.cv.getHomework()))
app.get('/api/orario',    requireCV, handler(req => req.cv.getTimetable()))

// ─────────────────────────────────────────────
//  404 + ERRORI GLOBALI
// ─────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ errore: `Route non trovata: ${req.method} ${req.path}` })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  log('error', 'Errore non gestito:', err.message)
  res.status(500).json({ errore: 'Errore interno del server' })
})

module.exports = app