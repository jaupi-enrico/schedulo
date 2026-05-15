require('dotenv').config()
const app = require('./app')

const PORT = process.env.PORT ?? 3004

app.listen(PORT, () => {
  const ts = new Date().toISOString()
  console.log(`[${ts}] 📘 Server pronto su http://localhost:${PORT}`)
})