"use client";
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Navigation, CloudRain, Sun, Thermometer, AlertTriangle, ArrowRight } from 'lucide-react';

interface WeatherData {
  location: { name: string; region: string; country: string };
  current: {
    temp_c: number;
    condition: { text: string; icon: string };
    wind_kph: number;
    humidity: number;
    uv: number;
    feelslike_c: number;
  };
}

export default function RoutePlanner() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originData, setOriginData] = useState<WeatherData | null>(null);
  const [destData, setDestData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (city: string) => {
    const res = await fetch(`/api/weather?q=${city}`);
    if (!res.ok) throw new Error(`Could not find ${city}`);
    return res.json();
  };

  const handlePlanJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      setError("Please enter both cities");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [start, end] = await Promise.all([
        fetchWeather(origin),
        fetchWeather(destination)
      ]);
      setOriginData(start);
      setDestData(end);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getJourneyAdvice = () => {
    if (!originData || !destData) return null;
    
    const tempDiff = destData.current.temp_c - originData.current.temp_c;
    const isRainy = originData.current.condition.text.toLowerCase().includes('rain') || 
                    destData.current.condition.text.toLowerCase().includes('rain');

    let advice = "";
    if (tempDiff > 5) advice = "It's significantly warmer at your destination. Pack light!";
    else if (tempDiff < -5) advice = "It's much colder at your destination. Bring a heavy jacket!";
    else advice = "The temperature is stable across your route.";

    if (isRainy) advice += " ⚠️ Also, rain is expected on this route, so bring an umbrella!";

    return advice;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-8 text-white font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-black mb-2 tracking-tight">RouteWeather</h1>
          <p className="text-blue-200/70">Plan your journey with weather intelligence</p>
        </header>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-10 border border-white/20 shadow-2xl">
          <form onSubmit={handlePlanJourney} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-200 ml-1">Starting Point</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-blue-300 w-5 h-5" />
                <input 
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Nakuru"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            <div className="hidden md:flex justify-center pb-3">
              <Navigation className="w-8 h-8 text-blue-400 rotate-45" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-200 ml-1">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-red-300 w-5 h-5" />
                <input 
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Mombasa"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-3 flex justify-center mt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="px-8 py-4 bg-blue-500 hover:bg-blue-400 rounded-2xl font-bold text-lg transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? "Analyzing Route..." : "Plan My Journey"} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-center mb-8 text-red-200">
              {error}
            </div>
          )}

          {originData && destData && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Route Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RouteCard city={originData} label="Origin" color="blue" />
                <RouteCard city={destData} label="Destination" color="red" />
              </div>

              {/* Journey Advice */}
              <div className="bg-blue-500/20 border border-blue-400/30 p-6 rounded-3xl flex items-start gap-4">
                <div className="p-3 bg-blue-500 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Journey Advice</h3>
                  <p className="text-blue-100 leading-relaxed">{getJourneyAdvice()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteCard({ city, WeatherData, label, color }: { city: WeatherData; label: string; color: 'blue' | 'red' }) {
  const colorClass = color === 'blue' ? 'text-blue-300' : 'text-red-300';
  const borderClass = color === 'blue' ? 'border-blue-500/30' : 'border-red-500/30';

  return (
    <div className={`p-6 rounded-3xl bg-white/5 border ${borderClass} backdrop-blur-sm`}>
      <div className="flex justify-between items-center mb-4">
        <span className={`text-xs font-bold uppercase tracking-widest ${colorClass}`}>{label}</span>
        <span className="text-2xl font-black">{Math.round(city.current.temp_c)}°C</span>
      </div>
      <h4 className="text-3xl font-bold mb-1">{city.location.name}</h4>
      <p className="text-white/60 mb-4">{city.location.country}</p>
      <div className="flex items-center gap-2 text-white/80">
        <CloudRain className="w-5 h-5" />
        <span>{city.current.condition.text}</span>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
