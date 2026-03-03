"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function MapPage() {
  const [position, setPosition] = useState(null);
  const [liveUsers, setLiveUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [explored, setExplored] = useState([]);
  const [mode, setMode] = useState("public");
  const [mapStyle, setMapStyle] = useState("street");
  const mapRef = useRef(null);

  const tileStyles = {
    street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}{r}.png",
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}{r}.png",
  };

  const detectMode = (speed) => {
    if (speed < 2) return "🚶 Walking";
    if (speed < 8) return "🚴 Cycling";
    return "🚗 Driving";
  };

  // Location tracking
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watch = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const currentSpeed = speed || 0;
        const travelMode = detectMode(currentSpeed);

        setPosition([latitude, longitude]);
        setExplored((prev) => [...prev, [latitude, longitude]]);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        if (mode === "public") {
          await supabase.from("live_locations").upsert({
            user_id: user.id,
            lat: latitude,
            lng: longitude,
            speed: currentSpeed,
            mode: travelMode,
            updated_at: new Date(),
          });
        }

        await supabase.from("explored_zones").insert({
          user_id: user.id,
          zone_key: latitude.toFixed(3) + "_" + longitude.toFixed(3),
        });
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watch);
  }, [mode]);

  // Load posts
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("posts").select("*");
      setPosts(data || []);
    };
    load();
  }, []);

  // Realtime users
  useEffect(() => {
    const channel = supabase
      .channel("live-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_locations" },
        async () => {
          const { data } = await supabase
            .from("live_locations")
            .select("*");
          setLiveUsers(data || []);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  if (!position)
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        🌍 Getting your location...
      </div>
    );

  return (
    <div className="h-screen w-full relative">
      {/* Control Panel */}
      <div className="absolute z-[1000] top-4 left-4 bg-black/80 text-white p-4 rounded-xl text-sm space-y-2">
        <div>
          Mode:
          <button
            onClick={() =>
              setMode(mode === "public" ? "private" : "public")
            }
            className="ml-2 px-2 py-1 bg-blue-500 rounded"
          >
            {mode}
          </button>
        </div>

        <div>
          Style:
          <select
            onChange={(e) => setMapStyle(e.target.value)}
            className="text-black ml-2"
          >
            <option value="street">Street</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div>👥 Live Users: {liveUsers.length}</div>
        <div>📍 Posts: {posts.length}</div>
      </div>

      <MapContainer
        center={position}
        zoom={16}
        className="h-full w-full"
        whenCreated={(map) => (mapRef.current = map)}
      >
        <TileLayer url={tileStyles[mapStyle]} />

        {/* My marker */}
        <Marker position={position}>
          <Popup>You are here 📍</Popup>
        </Marker>

        {/* Fog explored */}
        {explored.map((pos, i) => (
          <Circle
            key={i}
            center={pos}
            radius={30}
            pathOptions={{ color: "green", fillOpacity: 0.2 }}
          />
        ))}

        {/* Live users */}
        {liveUsers.map((u) => (
          <Marker key={u.user_id} position={[u.lat, u.lng]}>
            <Popup>
              {u.mode}
              <br />
              Speed: {u.speed?.toFixed(2)}
            </Popup>
          </Marker>
        ))}

        {/* Posts */}
        {posts.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <div>
                <p>{p.content}</p>
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt=""
                    style={{ width: "120px", marginTop: "5px" }}
                  />
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
    }
