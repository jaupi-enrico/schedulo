import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')

  return (
    <div style={{ padding: 40 }}>
      <h1>Login ClasseViva</h1>

      <input
        placeholder="Username"
        value={user}
        onChange={e => setUser(e.target.value)}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={pass}
        onChange={e => setPass(e.target.value)}
      />
      <br /><br />

      <button onClick={() => login(user, pass)}>Login</button>
    </div>
  )
}