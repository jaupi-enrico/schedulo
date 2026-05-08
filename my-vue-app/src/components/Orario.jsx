export default function Orario({ data }) {
  if (!data) return null
  if (data.length === 0) return <p>Nessun orario disponibile</p>

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Orario settimanale</h2>

      <div style={{ display: 'grid', gap: 10 }}>
        {data.map((day, index) => (
          <div
            key={day.id || index}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 10
            }}
          >
            <h3>
              📅 {day.day || day.giorno || `Giorno ${index + 1}`}
            </h3>

            {day.lessons?.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {day.lessons.map((l, i) => (
                  <li key={i}>
                    🕒 {l.hour || l.ora || "?"} — {l.subject || l.materia || "Materia"} 
                    {l.teacher && ` (${l.teacher})`}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nessuna lezione</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}