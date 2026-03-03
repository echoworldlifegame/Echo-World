"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function MapPage() {
  const [position, setPosition] = useState(null);
  const [liveUsers, setLiveUsers] = useState([]);

  // Live location tracking
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watch = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        await supabase.from("live_locations").upsert({
          user_id: user.id,
          lat: latitude,
          lng: longitude,
          updated_at: new Date(),
        });
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  // Realtime listener
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!position) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Getting location...
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <MapContainer center={position} zoom={15} className="h-full w-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* My location */}
        <Marker position={position}>
          <Popup>You are here</Popup>
        </Marker>

        {/* Other live users */}
        {liveUsers.map((u) => (
          <Marker key={u.user_id} position={[u.lat, u.lng]}>
            <Popup>Live user</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
            }
