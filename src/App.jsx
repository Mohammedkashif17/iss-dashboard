import { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import Navbar from './components/Navbar'
import ISSTracker from './components/ISSTracker'
import NewsDashboard from './components/NewsDashboard'
import Chatbot from './components/Chatbot'
import Charts from './components/Charts'

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('iss-theme') || 'dark')
  const [activeSection, setActiveSection] = useState('iss')
  const [issData, setIssData] = useState(null)
  const [issHistory, setIssHistory] = useState([])
  const [issSpeed, setIssSpeed] = useState(0)
  const [speedHistory, setSpeedHistory] = useState([])
  const [astronauts, setAstronauts] = useState({ number: 0, people: [] })
  const [newsData, setNewsData] = useState({})
  const [issLoading, setIssLoading] = useState(true)
  const [issError, setIssError] = useState(null)

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('iss-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // Haversine formula
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  // Fetch ISS position
  const fetchISS = useCallback(async (silent = false) => {
    if (!silent) setIssLoading(true)
    setIssError(null)
    try {
      // Primary: Use wheretheiss.at (very stable)
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544')
      if (!res.ok) throw new Error('Primary API down')
      const data = await res.json()
      
      const timestamp = data.timestamp
      const lat = parseFloat(data.latitude)
      const lon = parseFloat(data.longitude)
      const speed = Math.round(data.velocity)

      setIssData({ lat, lon, timestamp })
      setIssSpeed(speed)

      setIssHistory(prev => {
        const newHistory = [...prev, { lat, lon, timestamp }]
        const trimmed = newHistory.slice(-15)
        
        setSpeedHistory(sh => [...sh.slice(-29), { 
          time: new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
          speed 
        }])

        return trimmed
      })
    } catch (err) {
      // Fallback: Use open-notify.org
      try {
        const res = await fetch('https://api.open-notify.org/iss-now.json')
        const data = await res.json()
        const pos = data.iss_position
        const ts = data.timestamp
        const lat = parseFloat(pos.latitude)
        const lon = parseFloat(pos.longitude)

        setIssData({ lat, lon, timestamp: ts })

        setIssHistory(prev => {
          const newHistory = [...prev, { lat, lon, timestamp: ts }]
          const trimmed = newHistory.slice(-15)
          
          if (trimmed.length >= 2) {
            const p1 = trimmed[trimmed.length - 2]
            const p2 = trimmed[trimmed.length - 1]
            const dist = haversine(p1.lat, p1.lon, p2.lat, p2.lon)
            const timeDiff = (p2.timestamp - p1.timestamp) / 3600
            const calculatedSpeed = timeDiff > 0 ? Math.round(dist / timeDiff) : 27600
            const speed = Math.max(24000, Math.min(29000, calculatedSpeed))
            setIssSpeed(speed)
            setSpeedHistory(sh => [...sh.slice(-29), { time: new Date(ts * 1000).toLocaleTimeString(), speed }])
          }
          return trimmed
        })
      } catch (fallbackErr) {
        setIssError('ISS Tracking APIs are currently under maintenance. Please try again later.')
        if (!silent) toast.error('ISS connection failed')
      }
    } finally {
      setIssLoading(false)
    }
  }, [])

  // Fetch astronauts
  const fetchAstronauts = useCallback(async () => {
    try {
      const res = await fetch('https://api.open-notify.org/astros.json')
      const data = await res.json()
      setAstronauts({ number: data.number, people: data.people })
    } catch {
      setAstronauts({ number: 7, people: [] })
    }
  }, [])

  useEffect(() => {
    fetchISS()
    fetchAstronauts()
    const interval = setInterval(() => fetchISS(true), 15000)
    return () => clearInterval(interval)
  }, [fetchISS, fetchAstronauts])

  const dashboardContext = {
    issData,
    issSpeed,
    issHistory,
    astronauts,
    newsData,
    speedHistory,
    issLoading,
    issError,
    refreshISS: () => { fetchISS(); toast.success('ISS data refreshed!') },
  }

  return (
    <div className="app">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1a2235' : '#ffffff',
            color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
            border: '1px solid',
            borderColor: theme === 'dark' ? '#2d3748' : '#e2e8f0',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
      <main className="main-content">
        {activeSection === 'iss' && (
          <ISSTracker context={dashboardContext} />
        )}
        {activeSection === 'news' && (
          <NewsDashboard context={dashboardContext} />
        )}
        {activeSection === 'charts' && (
          <Charts context={dashboardContext} />
        )}
      </main>
      <Chatbot context={dashboardContext} theme={theme} />
    </div>
  )
}

export default App
