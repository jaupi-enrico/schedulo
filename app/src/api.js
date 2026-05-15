export async function api(path, options = {}) {
  const res = await fetch(`http://localhost:3004${path}`, {
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