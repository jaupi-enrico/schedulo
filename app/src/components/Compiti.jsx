export default function Compiti({ data }) {
  if (!data) return null
  if (data.length === 0) return <p>Nessun compito 🎉</p>

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Compiti</h2>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {data.map((c, index) => (
          <li
            key={c.id || index}
            style={{
              padding: 10,
              marginBottom: 10,
              border: '1px solid #ddd',
              borderRadius: 8
            }}
          >
            <strong>{c.subject || "Materia non specificata"}</strong>

            <p style={{ margin: '5px 0' }}>
              {c.text || c.description || "Nessuna descrizione"}
            </p>

            <small style={{ color: '#666' }}>
              📅 {c.dueDate || c.date || "Data non disponibile"}
            </small>
          </li>
        ))}
      </ul>
    </div>
  )
}