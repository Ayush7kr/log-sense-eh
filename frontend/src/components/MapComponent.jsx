import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLogsContext } from '../hooks/LogsContext';

const MapComponent = () => {
  const { opsMode } = useLogsContext();
  const [geoData, setGeoData] = useState([]);

  useEffect(() => {
    const fetchGeo = async () => {
      try {
        const res = await fetch(`/api/geo-data?mode=${opsMode || 'sim'}`);
        if (!res.ok) {
          setGeoData([]);
          return;
        }
        const data = await res.json();
        if (data && data.geoData) {
          setGeoData(data.geoData);
        } else {
          setGeoData([]);
        }
      } catch (e) {
        setGeoData([]);
      }
    };
    fetchGeo();
    const interval = setInterval(fetchGeo, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [opsMode]);

  const getIcon = (color) => {
    return new L.DivIcon({
      className: 'custom-icon',
      html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #111; box-shadow: 0 0 10px ${color}"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
  };

  const threatColor = '#ef4444'; // Red for threats

  if (geoData.length === 0) {
    return (
      <div style={{ minHeight: '300px', height: '100%' }} className="flex items-center justify-center w-full bg-[var(--bg-main)] opacity-50 rounded-xl border border-[var(--border-panel)]">
        <span className="text-[0.65rem] font-bold text-[var(--text-secondary)] uppercase tracking-widest">No geolocation data available for current mode</span>
      </div>
    );
  }

  // Find center based on first point, default to view most of the world
  const center = geoData[0] && geoData[0].lat ? [geoData[0].lat, geoData[0].lon] : [20, 0];

  return (
    <div style={{ height: '100%', minHeight: '300px', width: '100%', borderRadius: '0.75rem' }} className="overflow-hidden border border-[var(--border-panel)] relative z-0 shadow-lg">
      <MapContainer center={center} zoom={2} style={{ height: '100%', width: '100%', minHeight: '300px' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {geoData.map((loc, idx) => {
          let riskColor = '#3b82f6'; // Low (Blue)
          if (loc.risk === 'Medium') riskColor = '#f59e0b'; // Amber
          if (loc.risk === 'High' || loc.risk === 'Critical') riskColor = '#ef4444'; // Red
          
          return (loc.lat && loc.lon) ? (
            <Marker key={idx} position={[loc.lat, loc.lon]} icon={getIcon(riskColor)}>
              <Popup className="glass-popup">
                <div className="text-xs font-mono p-1">
                  <div className="font-bold mb-1" style={{ color: riskColor }}>{loc.ip}</div>
                  <div className="text-[var(--text-secondary)]">{loc.city}, {loc.country}</div>
                  <div className="text-[0.65rem] mt-1 opacity-80" style={{ color: riskColor }}>Risk: {loc.risk}</div>
                </div>
              </Popup>
            </Marker>
          ) : null;
        })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
