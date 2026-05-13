export default function Profilo({ data }) {
  if (!data) return null

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Profilo</h2>

      <pre>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}