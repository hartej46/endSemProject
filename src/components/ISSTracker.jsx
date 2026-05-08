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

// Fix for default marker icon in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// ISS Icon
const issIcon = L.icon({
  iconUrl: '/favicon.svg', // Production path
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Component to handle map center updates
const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center]);
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
      const response = await axios.get('https://api.wheretheiss.at/v1/satellites/25544');
      const { latitude, longitude } = response.data;
      const newPos = { lat: parseFloat(latitude), lng: parseFloat(longitude) };

      setPosition((prev) => {
        if (prev.lat !== 0) {
          const currentSpeed = calculateSpeed(prev, newPos, 5); // Updated to 5s interval
          setSpeed(currentSpeed);
          setSpeedHistory((prevH) => [...prevH.slice(-29), { time: new Date().toLocaleTimeString(), speed: currentSpeed }]);
        }
        return newPos;
      });

      setHistory((prev) => [...prev.slice(-49), [newPos.lat, newPos.lng]]);
      fetchNearestPlace(newPos.lat, newPos.lng);
      setLoading(false);
      
      // Notify parent of new data
      if (onDataUpdate) {
        onDataUpdate({
          ...newPos,
          speed,
          nearest: nearestPlace,
          peopleCount: peopleInSpace.count,
          peopleNames: peopleInSpace.names
        });
      }
    } catch (error) {
      console.error('Error fetching ISS data:', error);
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
      // Using a more reliable open-notify alternate if available or just a static fallback if blocked
      const res = await axios.get('https://api.allorigins.win/raw?url=http://api.open-notify.org/astros.json');
      setPeopleInSpace({ count: res.data.number, names: res.data.people.map(p => p.name) });
    } catch (e) {
      // Fallback for demo
      setPeopleInSpace({ count: 7, names: ['Expedition 71'] });
    }
  };

  useEffect(() => {
    fetchISSData();
    fetchPeopleData();
    const interval = setInterval(fetchISSData, 5000); // Polling every 5 seconds
    return () => clearInterval(interval);
  }, [speed, nearestPlace, peopleInSpace.count]);

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
    <div className="dashboard-grid">
      <div className="card lg:col-span-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Globe className="text-accent" /> ISS Live Tracking
          </h2>
          <div className="flex items-center gap-4">
            <button className="btn-secondary text-xs" onClick={fetchISSData}>Refresh Now</button>
            <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Auto-Refresh: ON</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card-mini">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Latitude / Longitude</p>
            <p className="text-lg font-black">{position.lat.toFixed(4)}, {position.lng.toFixed(4)}</p>
          </div>
          <div className="card-mini">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Speed</p>
            <p className="text-lg font-black">{speed} km/h</p>
          </div>
          <div className="card-mini md:col-span-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nearest Place</p>
            <p className="text-sm font-bold truncate">{nearestPlace}</p>
          </div>
        </div>

        <div className="h-[400px] rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner relative">
          <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
            <ChangeView center={[position.lat, position.lng]} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Polyline positions={history} color="#ff4b5c" weight={3} opacity={0.5} />
            <Marker position={[position.lat, position.lng]} icon={issIcon}>
              <Popup>ISS Position: {position.lat.toFixed(2)}, {position.lng.toFixed(2)}</Popup>
            </Marker>
          </MapContainer>
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-[10px] font-bold shadow-xl">
             🛰️ Orbit: LEO (Low Earth Orbit)
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Activity className="text-pink-500" /> ISS Speed Trend
          </h2>
          <div className="h-[250px]">
            <Line data={chartData} options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { 
                y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                x: { display: false }
              }
            }} />
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="text-cyan-500" /> People in Space
          </h2>
          <p className="text-4xl font-black mb-4">{peopleInSpace.count}</p>
          <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
            {peopleInSpace.names.map((name, i) => (
              <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200/50 dark:border-slate-700/50">
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
