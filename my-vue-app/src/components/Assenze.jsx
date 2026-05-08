export default function Assenze({ data }) {
  if (!data) return null
  if (data.length === 0) return <p>Nessuna assenza 🎉</p>

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Assenze</h2>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {data.map((a, index) => (
          <li
            key={a.id || index}
            style={{
              padding: 10,
              marginBottom: 10,
              border: '1px solid #ddd',
              borderRadius: 8,
              backgroundColor: a.justified ? '#e8f5e9' : '#ffebee'
            }}
          >
            <strong>
              📅 {a.date || "Data non disponibile"}
            </strong>

            <p style={{ margin: '5px 0' }}>
              Tipo: {a.type || "Assenza"}
            </p>

            <small>
              {a.justified
                ? "✅ Giustificata"
                : "❌ Non giustificata"}
            </small>
          </li>
        ))}
      </ul>
    </div>
  )
}