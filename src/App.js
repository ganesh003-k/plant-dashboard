import React, { useEffect, useState, useCallback } from "react";
import { Droplets, Sun, Thermometer, Wind, RefreshCw, AlertCircle, Download, Moon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const checkAlerts = useCallback((latest) => {
    if (!latest) return;
    
    const alerts = [];
    if (latest.soil_moisture < 30) alerts.push("🚨 Soil moisture is LOW! Plant needs water.");
    if (latest.temperature > 30) alerts.push("🔥 Temperature is HIGH!");
    if (latest.temperature < 15) alerts.push("❄️ Temperature is LOW!");
    if (latest.humidity < 40) alerts.push("💧 Humidity is LOW!");
    
    if (alerts.length > 0) {
      setAlertMessage(alerts.join(' | '));
      setShowAlert(true);
    } else {
      setShowAlert(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(
        "https://qtvqxuoxia.execute-api.ap-south-1.amazonaws.com/V1/readings"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();

      if (Array.isArray(json)) {
        const sortedData = json.sort((a, b) => b.timestamp - a.timestamp);
        setData(sortedData);
        setLastUpdate(new Date());
        setError(null);
        checkAlerts(sortedData[0]);
      } else if (json.body) {
        const parsedData = JSON.parse(json.body);
        if (Array.isArray(parsedData)) {
          const sortedData = parsedData.sort((a, b) => b.timestamp - a.timestamp);
          setData(sortedData);
          setLastUpdate(new Date());
          setError(null);
          checkAlerts(sortedData[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [checkAlerts]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const exportToCSV = () => {
    if (data.length === 0) return;
    
    const headers = ['Timestamp', 'Device ID', 'Soil Moisture (%)', 'Temperature (°C)', 'Humidity (%)', 'Light (lux)'];
    const csvContent = [
      headers.join(','),
      ...data.map(d => [
        new Date(d.timestamp).toLocaleString(),
        d.device_id,
        d.soil_moisture,
        d.temperature,
        d.humidity,
        d.light_lux
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plant-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateStats = (field) => {
    if (data.length === 0) return { min: 0, max: 0, avg: 0 };
    const values = data.map(d => d[field]).filter(v => v !== null && v !== undefined);
    return {
      min: Math.min(...values).toFixed(1),
      max: Math.max(...values).toFixed(1),
      avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
    };
  };

  const getChartData = () => {
    return data.slice(0, 20).reverse().map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString(),
      soil: d.soil_moisture,
      temp: d.temperature,
      humidity: d.humidity,
      light: d.light_lux
    }));
  };

  const getTrend = (field) => {
    if (data.length < 2) return 'stable';
    const latest = data[0][field];
    const previous = data[1][field];
    if (latest > previous + 1) return 'up';
    if (latest < previous - 1) return 'down';
    return 'stable';
  };

  const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (value, thresholds) => {
    if (value < thresholds.low) return darkMode ? "text-red-400" : "text-red-500";
    if (value < thresholds.medium) return darkMode ? "text-yellow-400" : "text-yellow-500";
    return darkMode ? "text-green-400" : "text-green-500";
  };

  const getStatusBg = (value, thresholds) => {
    if (darkMode) {
      if (value < thresholds.low) return "bg-red-900/30 border-red-700";
      if (value < thresholds.medium) return "bg-yellow-900/30 border-yellow-700";
      return "bg-green-900/30 border-green-700";
    }
    if (value < thresholds.low) return "bg-red-50 border-red-200";
    if (value < thresholds.medium) return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
  };

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 via-blue-50 to-purple-50';
  const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const subTextClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <RefreshCw className={`w-12 h-12 animate-spin ${darkMode ? 'text-green-400' : 'text-green-600'} mx-auto mb-4`} />
          <p className={`text-xl ${textClass}`}>Loading sensor data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
        <div className={`${cardClass} rounded-lg shadow-lg p-8 max-w-md text-center border`}>
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold ${textClass} mb-2`}>Connection Error</h2>
          <p className={`${subTextClass} mb-4`}>{error}</p>
          <button
            onClick={fetchData}
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
        <div className={`${cardClass} rounded-lg shadow-lg p-8 max-w-md text-center border`}>
          <Droplets className={`w-16 h-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'} mx-auto mb-4`} />
          <h2 className={`text-2xl font-bold ${textClass} mb-2`}>No Data Available</h2>
          <p className={`${subTextClass} mb-4`}>Waiting for sensor readings...</p>
          <button
            onClick={fetchData}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const latestReading = data[0];
  const chartData = getChartData();
  const soilStats = calculateStats('soil_moisture');
  const tempStats = calculateStats('temperature');
  const humStats = calculateStats('humidity');

  return (
    <div className={`min-h-screen ${bgClass} p-4 md:p-8 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        {/* Alert Banner */}
        {showAlert && (
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg mb-6 flex items-center justify-between animate-pulse">
            <span className="font-semibold">{alertMessage}</span>
            <button onClick={() => setShowAlert(false)} className="text-white hover:text-gray-200">✕</button>
          </div>
        )}

        {/* Header */}
        <div className={`${cardClass} rounded-2xl shadow-xl p-6 mb-6 border`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold ${textClass} mb-2`}>
                🌱 Plant Monitoring Dashboard
              </h1>
              <p className={subTextClass}>
                Device: <span className="font-semibold">{latestReading?.device_id}</span>
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`${darkMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-700 hover:bg-gray-800'} text-white p-3 rounded-lg transition`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={exportToCSV}
                className="bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
              <button
                onClick={fetchData}
                className="bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh
              </button>
            </div>
          </div>
          {lastUpdate && (
            <p className={`text-sm ${subTextClass} mt-4 text-center`}>
              Last update: {lastUpdate.toLocaleTimeString()} | Auto-refresh: Every 5s | Total readings: {data.length}
            </p>
          )}
        </div>

        {/* Current Readings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Soil Moisture */}
          <div className={`${cardClass} rounded-2xl shadow-lg p-6 border-2 ${getStatusBg(latestReading?.soil_moisture, { low: 30, medium: 50 })}`}>
            <div className="flex items-center justify-between mb-4">
              <Droplets className={`w-8 h-8 ${getStatusColor(latestReading?.soil_moisture, { low: 30, medium: 50 })}`} />
              <div className="flex items-center gap-2">
                <TrendIcon trend={getTrend('soil_moisture')} />
                <span className={`text-sm font-semibold ${subTextClass}`}>SOIL</span>
              </div>
            </div>
            <div className={`text-4xl font-bold ${textClass} mb-2`}>
              {latestReading?.soil_moisture?.toFixed(1)}%
            </div>
            <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2 mb-2`}>
              <div
                className={`h-2 rounded-full ${latestReading?.soil_moisture < 30 ? 'bg-red-500' : latestReading?.soil_moisture < 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${latestReading?.soil_moisture}%` }}
              ></div>
            </div>
            <div className={`text-xs ${subTextClass} mt-2`}>
              Min: {soilStats.min}% | Max: {soilStats.max}% | Avg: {soilStats.avg}%
            </div>
          </div>

          {/* Temperature */}
          <div className={`${cardClass} rounded-2xl shadow-lg p-6 border-2 ${darkMode ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <Thermometer className={`w-8 h-8 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
              <div className="flex items-center gap-2">
                <TrendIcon trend={getTrend('temperature')} />
                <span className={`text-sm font-semibold ${subTextClass}`}>TEMP</span>
              </div>
            </div>
            <div className={`text-4xl font-bold ${textClass}`}>
              {latestReading?.temperature?.toFixed(1)}°C
            </div>
            <p className={`text-sm ${subTextClass} mt-2`}>
              {latestReading?.temperature > 30 ? 'Hot' : latestReading?.temperature < 15 ? 'Cold' : 'Optimal'}
            </p>
            <div className={`text-xs ${subTextClass} mt-2`}>
              Min: {tempStats.min}°C | Max: {tempStats.max}°C | Avg: {tempStats.avg}°C
            </div>
          </div>

          {/* Humidity */}
          <div className={`${cardClass} rounded-2xl shadow-lg p-6 border-2 ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <Wind className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <div className="flex items-center gap-2">
                <TrendIcon trend={getTrend('humidity')} />
                <span className={`text-sm font-semibold ${subTextClass}`}>HUMIDITY</span>
              </div>
            </div>
            <div className={`text-4xl font-bold ${textClass}`}>
              {latestReading?.humidity?.toFixed(1)}%
            </div>
            <p className={`text-sm ${subTextClass} mt-2`}>
              {latestReading?.humidity > 70 ? 'High' : latestReading?.humidity < 40 ? 'Low' : 'Normal'}
            </p>
            <div className={`text-xs ${subTextClass} mt-2`}>
              Min: {humStats.min}% | Max: {humStats.max}% | Avg: {humStats.avg}%
            </div>
          </div>

          {/* Light */}
          <div className={`${cardClass} rounded-2xl shadow-lg p-6 border-2 ${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <Sun className={`w-8 h-8 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
              <div className="flex items-center gap-2">
                <TrendIcon trend={getTrend('light_lux')} />
                <span className={`text-sm font-semibold ${subTextClass}`}>LIGHT</span>
              </div>
            </div>
            <div className={`text-4xl font-bold ${textClass}`}>
              {latestReading?.light_lux?.toFixed(1)}
            </div>
            <p className={`text-sm ${subTextClass} mt-2`}>lux</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Soil & Temperature Chart */}
          <div className={`${cardClass} rounded-2xl shadow-xl p-6 border`}>
            <h3 className={`text-xl font-bold ${textClass} mb-4`}>Soil & Temperature Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="time" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: darkMode ? '#1f2937' : '#fff',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="soil" stroke="#3b82f6" name="Soil %" strokeWidth={2} />
                <Line type="monotone" dataKey="temp" stroke="#ef4444" name="Temp °C" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Humidity Chart */}
          <div className={`${cardClass} rounded-2xl shadow-xl p-6 border`}>
            <h3 className={`text-xl font-bold ${textClass} mb-4`}>Humidity Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="time" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: darkMode ? '#1f2937' : '#fff',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="humidity" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Humidity %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Data Table */}
        <div className={`${cardClass} rounded-2xl shadow-xl overflow-hidden border`}>
          <div className="p-6 bg-gradient-to-r from-green-500 to-blue-500">
            <h2 className="text-2xl font-bold text-white">Historical Data</h2>
            <p className="text-green-100">Last 10 readings</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${subTextClass} uppercase`}>Time</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${subTextClass} uppercase`}>Soil %</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${subTextClass} uppercase`}>Temp °C</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${subTextClass} uppercase`}>Humidity %</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold ${subTextClass} uppercase`}>Light</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.slice(0, 10).map((d, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-750' : 'bg-gray-50')}>
                    <td className={`px-6 py-4 text-sm ${textClass}`}>
                      {new Date(d.timestamp).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold ${getStatusColor(d.soil_moisture, { low: 30, medium: 50 })}`}>
                      {d.soil_moisture?.toFixed(1)}%
                    </td>
                    <td className={`px-6 py-4 text-sm ${textClass}`}>
                      {d.temperature?.toFixed(1)}°C
                    </td>
                    <td className={`px-6 py-4 text-sm ${textClass}`}>
                      {d.humidity?.toFixed(1)}%
                    </td>
                    <td className={`px-6 py-4 text-sm ${textClass}`}>
                      {d.light_lux?.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;