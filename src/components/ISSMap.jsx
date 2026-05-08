import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom ISS icon
const issIcon = L.divIcon({
  className: 'iss-marker',
  html: `<div style="
    width:40px;height:40px;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:20px;
    box-shadow:0 0 16px rgba(99,102,241,0.8),0 0 32px rgba(99,102,241,0.4);
    border:2px solid rgba(255,255,255,0.3);
    animation: isspin 4s linear infinite;
  ">🛰️</div>
  <style>
    @keyframes isspin {
      0%,100%{box-shadow:0 0 16px rgba(99,102,241,0.8),0 0 32px rgba(99,102,241,0.4);}
      50%{box-shadow:0 0 24px rgba(99,102,241,1),0 0 48px rgba(99,102,241,0.6);}
    }
  </style>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
})

// Waypoint icon
const waypointIcon = L.divIcon({
  className: '',
  html: `<div style="width:8px;height:8px;background:#6366f1;border-radius:50%;opacity:0.6;border:1px solid rgba(255,255,255,0.4);"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4],
})

// Auto-center map on ISS position
function MapUpdater({ lat, lon }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lon) {
      map.setView([lat, lon], map.getZoom(), { animate: true, duration: 1 })
    }
  }, [lat, lon, map])
  return null
}

export default function ISSMap({ issData, issHistory }) {
  if (!issData) {
    return (
      <div className="map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)' }}>
        <div className="spinner" />
      </div>
    )
  }

  const pathCoords = issHistory.map(p => [p.lat, p.lon])

  return (
    <div className="map-container">
      <MapContainer
        center={[issData.lat, issData.lon]}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />

        {/* Trajectory path */}
        {pathCoords.length > 1 && (
          <Polyline
            positions={pathCoords}
            color="#6366f1"
            weight={2}
            opacity={0.7}
            dashArray="6, 4"
          />
        )}

        {/* Historical waypoints */}
        {issHistory.slice(0, -1).map((pos, i) => (
          <Marker key={i} position={[pos.lat, pos.lon]} icon={waypointIcon}>
            <Popup>
              <div style={{ fontSize: '12px' }}>
                <strong>Position {i + 1}</strong><br />
                Lat: {pos.lat.toFixed(4)}°<br />
                Lon: {pos.lon.toFixed(4)}°
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Current ISS position */}
        <Marker position={[issData.lat, issData.lon]} icon={issIcon}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', minWidth: '160px' }}>
              <strong style={{ fontSize: '14px' }}>🛰️ ISS Position</strong><br /><br />
              <span>Lat: {issData.lat.toFixed(4)}°</span><br />
              <span>Lon: {issData.lon.toFixed(4)}°</span><br />
              <span style={{ color: '#6366f1' }}>Updated: just now</span>
            </div>
          </Popup>
        </Marker>

        <MapUpdater lat={issData.lat} lon={issData.lon} />
      </MapContainer>
    </div>
  )
}
