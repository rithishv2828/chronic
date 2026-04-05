import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MapPin, Navigation, Search, Loader2, Hospital, ExternalLink, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface HospitalInfo {
  name: string;
  address: string;
  distance?: string;
  rating?: number;
  mapsUrl: string;
}

export default function Hospitals({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<HospitalInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    setIsLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        findHospitals(latitude, longitude);
      },
      (err) => {
        console.error("Location error:", err);
        setError("Unable to retrieve your location. Please check your permissions.");
        setIsLoading(false);
      }
    );
  };

  const findHospitals = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Find the nearest hospitals and medical centers to my current location. Provide a list of at least 5 hospitals with their names, addresses, and Google Maps links.",
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng
              }
            }
          }
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const foundHospitals: HospitalInfo[] = chunks
          .filter((c: any) => c.maps?.uri)
          .map((c: any) => ({
            name: c.maps.title || "Hospital",
            address: c.maps.uri.split('place/')[1]?.replace(/\+/g, ' ').split('/')[0] || "Nearby",
            mapsUrl: c.maps.uri
          }));
        setHospitals(foundHospitals);
      } else {
        setError("No hospitals found nearby.");
      }
    } catch (err) {
      console.error("Gemini Maps error:", err);
      setError("Failed to fetch nearby hospitals. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center transition-colors">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Find Nearby Hospitals</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
          Quickly locate the nearest medical facilities and hospitals based on your current location.
        </p>

        {!location ? (
          <button
            onClick={requestLocation}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
            {isLoading ? 'Accessing Location...' : 'Use My Current Location'}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Location Accessed: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            <button onClick={requestLocation} className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">Refresh</button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-3">
          <Hospital className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {hospitals.map((hospital, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center group-hover:bg-blue-600 dark:group-hover:bg-blue-500 transition-colors">
                  <Hospital className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <a 
                  href={hospital.mapsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{hospital.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{hospital.address}</p>
              <a 
                href={hospital.mapsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Globe className="w-4 h-4" />
                View on Google Maps
              </a>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isLoading && hospitals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Searching for hospitals nearby...</p>
        </div>
      )}
    </div>
  );
}
