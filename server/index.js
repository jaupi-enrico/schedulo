const express = require('express')
const cors = require('cors')
const session = require('express-session')
const { ClasseViva } = require('classeviva-apiv2')

const app = express()

// ===== Middleware base =====
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())

app.use(session({
  secret: 'il-gatto-di-mia-nonna-non-esiste',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2 // 2 ore
  }
}))

async function getCV(req) {
  const { user, pass } = req.session
  if (!user || !pass) return null

  const cv = new ClasseViva(user, pass)
  await cv.login()
  return cv
}

async function requireCV(req, res, next) {
  try {
    const cv = await getCV(req)
    if (!cv) return res.status(401).json({ errore: 'Non loggato' })

    req.cv = cv
    next()
  } catch (err) {
    res.status(401).json({ errore: 'Sessione scaduta' })
  }
}

app.post('/api/login', async (req, res) => {
  try {
    const { user, pass } = req.body

    const cv = new ClasseViva(user, pass)
    await cv.login()

    // Salviamo SOLO dati serializzabili
    req.session.user = user
    req.session.pass = pass

    res.json({ ok: true })
  } catch (err) {
    res.status(401).json({ errore: err.message })
  }
})

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true })
  })
})

app.get('/api/profilo', requireCV, async (req, res) => {
  res.json(await req.cv.getProfile())
})

app.get('/api/voti', requireCV, async (req, res) => {
  res.json(await req.cv.getGrades())
})

app.get('/api/assenze', requireCV, async (req, res) => {
  res.json(await req.cv.getAbsences())
})

app.get('/api/ritardi', requireCV, async (req, res) => {
  res.json(await req.cv.getDelays())
})

app.get('/api/note', requireCV, async (req, res) => {
  res.json(await req.cv.getNotes())
})

app.get('/api/argomenti', requireCV, async (req, res) => {
  res.json(await req.cv.getLessons())
})

app.get('/api/compiti', requireCV, async (req, res) => {
  res.json(await req.cv.getHomework())
})

app.get('/api/orario', requireCV, async (req, res) => {
  res.json(await req.cv.getTimetable())
})

app.listen(3000, () => {
  console.log('Server pronto su http://localhost:3000')
})