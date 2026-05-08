import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { MapPin, Navigation, Users, Globe, Activity } from 'lucide-react';
import { toast } from 'react-toastify';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Fix for default marker icon in Leaflet using CDN links
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// ISS Icon - Satellite
const issIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1043/1043445.png', 
  iconSize: [35, 35],
  iconAnchor: [17, 17],
});

// Component to handle map center updates
const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 || center[1] !== 0) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const ISSTracker = ({ onDataUpdate }) => {
  const [position, setPosition] = useState({ lat: 0, lng: 0 });
  const [history, setHistory] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearestPlace, setNearestPlace] = useState('Fetching...');
  const [peopleInSpace, setPeopleInSpace] = useState({ count: 0, names: [] });

  const calculateSpeed = (prev, next, timeInterval) => {
    const R = 6371; // Earth radius in km
    const dLat = (next.lat - prev.lat) * Math.PI / 180;
    const dLon = (next.lng - prev.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(prev.lat * Math.PI / 180) * Math.cos(next.lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return (distance / (timeInterval / 3600)).toFixed(2); // km/h
  };

  const fetchISSData = async () => {
    try {
      // Using WhereTheISS API - Native HTTPS, no proxy needed for Vercel
      const response = await axios.get('https://api.wheretheiss.at/v1/satellites/25544');
      const data = response.data;
      
      const { latitude, longitude, velocity } = data;
      const newPos = { lat: parseFloat(latitude), lng: parseFloat(longitude) };

      setPosition((prev) => {
        const currentSpeed = parseFloat(velocity).toFixed(2);
        setSpeed(currentSpeed);
        setSpeedHistory((prevH) => [
          ...prevH.slice(-29), 
          { time: new Date().toLocaleTimeString(), speed: currentSpeed }
        ]);
        return newPos;
      });

      setHistory((prev) => [...prev.slice(-99), [newPos.lat, newPos.lng]]);
      fetchNearestPlace(newPos.lat, newPos.lng);
      setLoading(false);
      
      if (onDataUpdate) {
        onDataUpdate({
          ...newPos,
          speed: velocity,
          nearest: nearestPlace,
          peopleCount: peopleInSpace.count,
          peopleNames: peopleInSpace.names
        });
      }
    } catch (error) {
      console.error('Error fetching ISS data:', error);
      // Fallback if WhereTheISS also fails (unlikely)
      toast.error('Mission Control connection issue. Reconnecting...');
    }
  };

  const fetchNearestPlace = async (lat, lng) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`, {
        headers: { 'User-Agent': 'MissionControlDashboard/1.0' }
      });
      setNearestPlace(res.data.display_name || 'Over ocean / remote area');
    } catch (e) {
      setNearestPlace('Over ocean / remote area');
    }
  };

  const fetchPeopleData = async () => {
    try {
      // Using AllOrigins for People data as fallback
      const targetUrl = 'http://api.open-notify.org/astros.json';
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&timestamp=${Date.now()}`;
      const res = await axios.get(proxyUrl);
      const data = JSON.parse(res.data.contents);
      setPeopleInSpace({ count: data.number, names: data.people.map(p => p.name) });
    } catch (e) {
      console.error('Error fetching people data:', e);
      // Hardcoded fallback for known mission
      setPeopleInSpace({ 
        count: 7, 
        names: ['Oleg Kononenko', 'Nikolai Chub', 'Tracy Dyson', 'Matthew Dominick', 'Michael Barratt', 'Jeanette Epps', 'Alexander Grebenkin'] 
      });
    }
  };

  useEffect(() => {
    fetchISSData();
    fetchPeopleData();
    const interval = setInterval(fetchISSData, 15000); // Increased to 15s to prevent rate limits
    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: speedHistory.map(h => h.time),
    datasets: [{
      label: 'ISS Speed (km/h)',
      data: speedHistory.map(h => h.speed),
      fill: true,
      borderColor: '#ff4b5c',
      backgroundColor: 'rgba(255, 75, 92, 0.1)',
      tension: 0.4,
    }]
  };

  return (
    <div className="grid-layout">
      <div className="flex flex-col gap-6">
        <div className="card">
          <div className="ncr-top mb-6">
            <h2 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>ISS Live Tracking</h2>
            <div className="flex gap-2">
              <button className="btn-pill" onClick={fetchISSData}>Refresh Now</button>
              <button className="btn-pill">Auto-Refresh: ON</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="stat-box">
              <p className="text-[10px] font-bold opacity-50 uppercase">Latitude / Longitude</p>
              <p className="text-sm font-black">{position.lat.toFixed(3)}, {position.lng.toFixed(3)}</p>
            </div>
            <div className="stat-box">
              <p className="text-[10px] font-bold opacity-50 uppercase">Speed</p>
              <p className="text-sm font-black">{speed} km/h</p>
            </div>
            <div className="stat-box">
              <p className="text-[10px] font-bold opacity-50 uppercase">Nearest Place</p>
              <p className="text-sm font-black truncate">{nearestPlace.split(',')[0]}</p>
            </div>
            <div className="stat-box">
              <p className="text-[10px] font-bold opacity-50 uppercase">Tracked Positions</p>
              <p className="text-sm font-black">{history.length}</p>
            </div>
          </div>

          <div className="h-[400px] rounded-2xl overflow-hidden relative border border-current/5">
            <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} className="map-light">
              <ChangeView center={[position.lat, position.lng]} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline positions={history} color="var(--accent)" weight={2} opacity={0.6} />
              <Marker position={[position.lat, position.lng]} icon={issIcon} />
            </MapContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="card">
          <h2 className="text-lg font-bold tracking-tight mb-8" style={{ fontFamily: 'var(--font-display)' }}>ISS Speed Trend</h2>
          <div className="h-[300px]">
            <Line data={{
              ...chartData,
              datasets: [{
                ...chartData.datasets[0],
                borderColor: '#e5634d',
                backgroundColor: 'rgba(229, 99, 77, 0.05)',
                borderWidth: 2,
                pointRadius: 0,
              }]
            }} options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: { 
                legend: { 
                  display: true,
                  position: 'top',
                  align: 'end',
                  labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } }
                } 
              },
              scales: { 
                y: { 
                  grid: { color: 'rgba(0, 0, 0, 0.03)' }, 
                  ticks: { color: 'var(--muted)', font: { size: 9, weight: 'bold' } },
                  border: { display: false }
                },
                x: { 
                  grid: { display: false },
                  ticks: { color: 'var(--muted)', font: { size: 9, weight: 'bold' }, maxRotation: 45, minRotation: 45 }
                }
              }
            }} />
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            People in Space
          </h2>
          <div className="flex items-end gap-2 mb-4">
            <p className="text-4xl font-black leading-none">{peopleInSpace.count}</p>
            <span className="text-xs font-bold opacity-40 mb-1">Astronauts currently orbiting</span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
            {peopleInSpace.names.map((name, i) => (
              <span key={i} className="text-[10px] font-bold px-3 py-2 rounded-xl border shadow-sm"
                style={{ backgroundColor: 'var(--panel-elev)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ISSTracker;
