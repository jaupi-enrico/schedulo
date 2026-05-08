import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Profilo from '../components/Profilo'
import Voti from '../components/Voti'
import Assenze from '../components/Assenze'
import Compiti from '../components/Compiti'
import Orario from '../components/Orario'

export default function Dashboard() {
  const { logout } = useAuth()

  const [profilo, setProfilo] = useState(null)
  const [voti, setVoti] = useState([])
  const [assenze, setAssenze] = useState([])
  const [compiti, setCompiti] = useState([])
  const [orario, setOrario] = useState([])

  const caricaTutto = async () => {
    setProfilo(await api('/api/profilo'))
    setVoti(await api('/api/voti'))
    setAssenze(await api('/api/assenze'))
    setCompiti(await api('/api/compiti'))
    setOrario(await api('/api/orario'))
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>

      <button onClick={caricaTutto}>Carica dati</button>
      <button onClick={logout}>Logout</button>

      <Profilo data={profilo} />
      <Voti data={voti} />
      <Assenze data={assenze} />
      <Compiti data={compiti} />
      <Orario data={orario} />
    </div>
  )
}