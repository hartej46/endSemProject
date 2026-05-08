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
      const response = await axios.get('https://api.wheretheiss.at/v1/satellites/25544');
      const { latitude, longitude } = response.data;
      const newPos = { lat: parseFloat(latitude), lng: parseFloat(longitude) };

      setPosition((prev) => {
        if (prev.lat !== 0) {
          const currentSpeed = calculateSpeed(prev, newPos, 10);
          setSpeed(currentSpeed);
          setSpeedHistory((prevH) => [...prevH.slice(-29), { time: new Date().toLocaleTimeString(), speed: currentSpeed }]);
        }
        return newPos;
      });

      setHistory((prev) => [...prev.slice(-99), [newPos.lat, newPos.lng]]);
      fetchNearestPlace(newPos.lat, newPos.lng);
      setLoading(false);
      
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
      const res = await axios.get('https://api.allorigins.win/raw?url=http://api.open-notify.org/astros.json');
      setPeopleInSpace({ count: res.data.number, names: res.data.people.map(p => p.name) });
    } catch (e) {
      setPeopleInSpace({ count: 7, names: ['Expedition 71'] });
    }
  };

  useEffect(() => {
    fetchISSData();
    fetchPeopleData();
    const interval = setInterval(fetchISSData, 10000); // Polling every 10 seconds for stability
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
    <div className="grid-iss">
      <div className="flex flex-col gap-6">
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <Globe className="text-pink-500" size={20} /> ISS Live Tracking
            </h2>
            <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold" onClick={fetchISSData}>Refresh Now</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Coordinates</p>
              <p className="text-sm font-black">{position.lat.toFixed(2)}, {position.lng.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Speed</p>
              <p className="text-sm font-black">{speed} km/h</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Location</p>
              <p className="text-xs font-bold truncate">{nearestPlace}</p>
            </div>
          </div>

          <div className="h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-100">
            <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
              <ChangeView center={[position.lat, position.lng]} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline positions={history} color="#ff4b5c" weight={2} opacity={0.4} />
              <Marker position={[position.lat, position.lng]} icon={issIcon} />
            </MapContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
            <Activity className="text-pink-500" /> ISS Speed Trend
          </h2>
          <div className="h-[250px]">
            <Line data={chartData} options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { 
                y: { grid: { color: 'rgba(148, 163, 184, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                x: { display: false }
              }
            }} />
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
            <Users className="text-blue-500" /> People in Space
          </h2>
          <p className="text-3xl font-black mb-4 text-slate-800 dark:text-white">{peopleInSpace.count}</p>
          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
            {peopleInSpace.names.map((name, i) => (
              <span key={i} className="text-[9px] font-bold px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700">
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
