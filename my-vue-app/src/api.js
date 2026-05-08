export async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  })

  if (!res.ok) {
    throw new Error('Errore API')
  }

  return res.json()
}