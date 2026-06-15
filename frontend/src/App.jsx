import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const C = {
  bg:      "#0b0f1a",
  surface: "#111827",
  card:    "#1a2235",
  border:  "#1e2d45",
  accent:  "#3b82f6",
  green:   "#22c55e",
  red:     "#ef4444",
  orange:  "#f97316",
  muted:   "#64748b",
  text:    "#e2e8f0",
  textDim: "#94a3b8",
};

const makeIcon = (color, label) =>
  L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="
          background:#111827;border:2px solid ${color};border-radius:6px;
          padding:3px 8px;font-size:11px;font-weight:700;color:${color};
          font-family:monospace;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.5)
        ">${label}</div>
        <div style="width:10px;height:10px;background:${color};border:2px solid white;
          border-radius:50%;box-shadow:0 0 6px ${color}88"></div>
      </div>`,
    iconSize:   [60, 36],
    iconAnchor: [30, 36],
  });

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: C.text, marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function VehicleCard({ v, selected, onClick }) {
  const isDelayed = v.status === "Delayed";
  const accent    = isDelayed ? C.red : C.green;
  return (
    <div onClick={onClick} style={{
      background: selected ? `${accent}12` : C.card,
      border: `1px solid ${selected ? accent : C.border}`,
      borderRadius: 10, padding: "12px 14px", cursor: "pointer",
      transition: "all .15s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{v.vehicleId}</div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: accent,
          background: `${accent}18`, borderRadius: 20, padding: "3px 10px",
        }}>
          {v.status}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <DataRow label="Speed"  value={`${v.speedMph} mph`} />
        <DataRow label="Route"  value={isDelayed ? "Stationary" : "On Route"} />
        <div style={{ gridColumn: "1/-1" }}>
          <DataRow label="Position" value={`${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}`} mono />
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
        Last update <span style={{ color: C.accent }}>2 sec ago</span>
      </div>
    </div>
  );
}

function DataRow({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
      <div style={{ fontSize: 12, color: C.textDim, marginTop: 2, fontFamily: mono ? "monospace" : "inherit" }}>
        {value}
      </div>
    </div>
  );
}

function ActivityFeed({ log }) {
  if (!log.length) return null;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: ".08em", marginBottom: 10 }}>
        RECENT ACTIVITY
      </div>
      {log.slice(-5).reverse().map((e, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          padding: "6px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none",
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", marginTop: 4, flexShrink: 0,
            background: e.status === "Delayed" ? C.red : C.green,
          }} />
          <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>
            <span style={{ color: C.text, fontWeight: 600 }}>{e.vehicleId}</span>
            {" "}{e.status === "Delayed"
              ? "flagged as Delayed (Stationary)"
              : `moved to ${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}`}
            <div style={{ fontSize: 11, color: C.muted }}>2 sec ago</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [vehicles,  setVehicles]  = useState({});
  const [alerts,    setAlerts]    = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [actLog,    setActLog]    = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
     webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL || "http://localhost:8080"}/ws`),
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/fleet", (msg) => {
          const v = JSON.parse(msg.body);
          if (v.status === "Delayed") {
            setAlerts((prev) =>
              prev.find((a) => a.vehicleId === v.vehicleId)
                ? prev
                : [...prev, { ...v, time: new Date().toLocaleTimeString() }]
            );
          }
          setVehicles((prev) => ({ ...prev, [v.vehicleId]: v }));
          setActLog((prev) => [...prev.slice(-19), v]);
        });
      },
      onDisconnect: () => setConnected(false),
    });
    client.activate();
    return () => client.deactivate();
  }, []);

  const vehicleList  = Object.values(vehicles);
  const activeCount  = vehicleList.filter((v) => v.status === "Active").length;
  const delayedCount = vehicleList.filter((v) => v.status === "Delayed").length;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh", width: "100vw",
      background: C.bg, color: C.text,
      fontFamily: "'Inter','Segoe UI',sans-serif", overflow: "hidden",
    }}>

      {/* Top bar */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "0 24px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: `linear-gradient(135deg, ${C.accent}, #6366f1)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 800, color: "white",
          }}>L</div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.02em" }}>
              <span style={{ color: C.accent }}>Live</span>Pulse
            </span>
            <span style={{ fontSize: 12, color: C.muted, marginLeft: 10 }}>
              Real-Time Fleet Monitor
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {alerts.length > 0 && (
            <div style={{
              background: `${C.red}15`, border: `1px solid ${C.red}44`,
              borderRadius: 20, padding: "4px 12px",
              fontSize: 12, color: C.red, fontWeight: 600,
            }}>
              {alerts.length} active alert{alerts.length > 1 ? "s" : ""}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: connected ? C.green : C.red,
              boxShadow: connected ? `0 0 6px ${C.green}` : "none",
            }} />
            <span style={{ color: connected ? C.green : C.red, fontWeight: 600 }}>
              {connected ? "Connected" : "Connecting..."}
            </span>
            <span style={{ color: C.muted }}>via WebSocket</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 12, flexShrink: 0, minWidth: 0 }}>
        <StatCard label="Total Vehicles" value={vehicleList.length} sub="All tracked"  accent={C.accent} />
        <StatCard label="Moving"         value={activeCount}        sub={vehicleList.length ? `${Math.round(activeCount / vehicleList.length * 100)}% of fleet` : "—"} accent={C.green} />
        <StatCard label="Delayed"        value={delayedCount}       sub={vehicleList.length ? `${Math.round(delayedCount / vehicleList.length * 100)}% of fleet` : "—"} accent={C.orange} />
        <StatCard label="Active Alerts"  value={alerts.length}      sub={alerts.length ? "Requires attention" : "All clear"} accent={C.red} />
      </div>

      {/* Map + right panel */}
      <div style={{ flex: 1, display: "flex", gap: 0, padding: "16px 24px", overflow: "hidden" }}>

        {/* Map */}
        <div style={{
          flex: 1, borderRadius: 12, overflow: "hidden",
          border: `1px solid ${C.border}`, marginRight: 16,
        }}>
          <MapContainer center={[38.9072, -77.0369]} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {vehicleList.map((v) => (
              <Marker
                key={v.vehicleId}
                position={[v.latitude, v.longitude]}
                icon={makeIcon(v.status === "Delayed" ? C.red : C.green, v.vehicleId)}
                eventHandlers={{ click: () => setSelected(v.vehicleId) }}
              >
                <Popup>
                  <div style={{ fontFamily: "sans-serif", minWidth: 140 }}>
                    <b style={{ fontSize: 14 }}>{v.vehicleId}</b>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Speed: {v.speedMph} mph</div>
                    <div style={{ fontSize: 12 }}>Status: {v.status}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#666", marginTop: 4 }}>
                      {v.latitude.toFixed(5)}, {v.longitude.toFixed(5)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Right panel */}
        <div style={{ width: 300, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>

          {/* Alert banners */}
          {alerts.map((a) => (
            <div key={a.vehicleId} style={{
              background: `${C.red}10`, border: `1px solid ${C.red}44`,
              borderRadius: 10, padding: "10px 14px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.red, letterSpacing: ".08em" }}>
                ALERT
              </div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 2 }}>
                {a.vehicleId} is stationary
              </div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>
                Vehicle has not moved. Flagged at {a.time}.
              </div>
            </div>
          ))}

          {/* Vehicle cards */}
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: ".08em" }}>
            VEHICLES
          </div>
          {vehicleList.length === 0 ? (
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: 20, textAlign: "center", color: C.muted, fontSize: 13,
            }}>
              Waiting for fleet data...
            </div>
          ) : (
            vehicleList.map((v) => (
              <VehicleCard
                key={v.vehicleId} v={v}
                selected={selected === v.vehicleId}
                onClick={() => setSelected(v.vehicleId === selected ? null : v.vehicleId)}
              />
            ))
          )}

          <ActivityFeed log={actLog} />
        </div>
      </div>
    </div>
  );
}