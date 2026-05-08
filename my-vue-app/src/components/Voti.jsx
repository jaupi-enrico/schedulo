export default function Voti({ data }) {
  if (!data.length) return null

  return (
    <>
      <h2>Voti</h2>
      <ul>
        {data.map(v => (
          <li key={v.id}>
            {v.subject} — {v.value}
          </li>
        ))}
      </ul>
    </>
  )
}