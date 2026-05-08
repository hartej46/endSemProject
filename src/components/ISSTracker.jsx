import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateSpeed } from '../utils/issUtils';
import axios from 'axios';
import { toast } from 'react-toastify';
import { RefreshCw, Navigation, Zap, MapPin, Users } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

// Fix for default marker icon in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const ISSIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2091/2091210.png', // ISS Icon
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center);
  return null;
}

const ISSTracker = ({ onDataUpdate }) => {
  const [position, setPosition] = useState({ lat: 0, lng: 0 });
  const [history, setHistory] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [nearestPlace, setNearestPlace] = useState('Fetching...');
  const [peopleInSpace, setPeopleInSpace] = useState({ count: 0, names: [] });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);

  // Use effect to update parent data
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate({
        lat: position.lat,
        lng: position.lng,
        speed: speed.toFixed(2),
        nearest: nearestPlace,
        peopleCount: peopleInSpace.count,
        peopleNames: peopleInSpace.names
      });
    }
  }, [position, speed, nearestPlace, peopleInSpace]);

  const fetchISSData = async () => {
    try {
      const response = await axios.get('http://api.open-notify.org/iss-now.json');
      const { latitude, longitude } = response.data.iss_position;
      const newPos = { lat: parseFloat(latitude), lng: parseFloat(longitude) };

      setPosition((prev) => {
        if (prev.lat !== 0) {
          const currentSpeed = calculateSpeed(prev, newPos, 15);
          setSpeed(currentSpeed);
          setSpeedHistory((prevH) => [...prevH.slice(-29), { time: new Date().toLocaleTimeString(), speed: currentSpeed }]);
        }
        return newPos;
      });

      setHistory((prev) => [...prev.slice(-14), [newPos.lat, newPos.lng]]);
      fetchNearestPlace(newPos.lat, newPos.lng);
      setLoading(false);
      toast.success('ISS data refreshed.', { autoClose: 2000 });
    } catch (error) {
      console.error('Error fetching ISS data:', error);
    }
  };

  const fetchNearestPlace = async (lat, lng) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
      setNearestPlace(res.data.display_name || 'Over ocean / remote area');
    } catch (e) {
      setNearestPlace('Over ocean / remote area');
    }
  };

  const fetchPeopleData = async () => {
    try {
      const res = await axios.get('http://api.open-notify.org/astros.json');
      setPeopleInSpace({ count: res.data.number, names: res.data.people.map(p => p.name) });
    } catch (e) {
      console.error('Error fetching people data:', e);
    }
  };

  useEffect(() => {
    fetchISSData();
    fetchPeopleData();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchISSData, 15000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const chartData = {
    labels: speedHistory.map(h => h.time),
    datasets: [
      {
        label: 'ISS Speed (km/h)',
        data: speedHistory.map(h => h.speed),
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="grid grid-iss gap-1.5">
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">ISS Live Tracking</h2>
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2" onClick={fetchISSData}>
              <RefreshCw size={16} /> Refresh Now
            </button>
            <button 
              className={`btn-secondary ${autoRefresh ? 'bg-green-100' : ''}`} 
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              Auto-Refresh: {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="grid grid-4 gap-2 mb-4">
          <div className="card-mini bg-gray-50 p-3 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold">Latitude / Longitude</span>
            <p className="font-bold">{position.lat.toFixed(3)}, {position.lng.toFixed(3)}</p>
          </div>
          <div className="card-mini bg-gray-50 p-3 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold">Speed</span>
            <p className="font-bold">{speed.toFixed(2)} km/h</p>
          </div>
          <div className="card-mini bg-gray-50 p-3 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold">Nearest Place</span>
            <p className="font-bold text-sm truncate">{nearestPlace}</p>
          </div>
          <div className="card-mini bg-gray-50 p-3 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold">Tracked Positions</span>
            <p className="font-bold">{history.length}</p>
          </div>
        </div>

        <MapContainer center={[0, 0]} zoom={2} scrollWheelZoom={true}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={[position.lat, position.lng]} icon={ISSIcon}>
            <Tooltip permanent direction="top" offset={[0, -20]}>
              ISS Position: {position.lat.toFixed(2)}, {position.lng.toFixed(2)}
            </Tooltip>
          </Marker>
          <Polyline positions={history} color="#e74c3c" weight={3} opacity={0.6} />
          <ChangeView center={[position.lat, position.lng]} />
        </MapContainer>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="card h-full">
          <h2 className="text-xl font-bold mb-4">ISS Speed Trend</h2>
          <div style={{ height: '250px' }}>
            <Line 
              data={chartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: false } }
              }} 
            />
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Users size={20} /> People in Space
          </h2>
          <p className="text-3xl font-bold mb-2">{peopleInSpace.count}</p>
          <div className="flex flex-wrap gap-2">
            {peopleInSpace.names.map((name, i) => (
              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
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
