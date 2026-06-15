# LivePulse — Real-Time Fleet Dispatch Dashboard

A full-stack, enterprise-grade fleet monitoring system that streams live vehicle telemetry to an operational dashboard via WebSockets. Built with Java Spring Boot, React, and deployed on AWS EC2.

**Live Demo:** [livepulse-mu.vercel.app](https://livepulse-mu.vercel.app)

---

## What It Does

LivePulse solves a real logistics engineering problem: how do you display a continuous stream of high-frequency GPS data to an operations team in real time, without polling?

The answer is a persistent WebSocket connection. The Spring Boot backend runs a fleet simulator that broadcasts vehicle telemetry every 2 seconds. The React frontend maintains an open connection to that stream and updates the map and dashboard the instant new data arrives — no page refresh, no polling loop.

The result is an ops dashboard where a dispatcher can see every vehicle's position, speed, and status live, and receive automatic alerts when a vehicle goes stationary.

---

## Features

- **Live Map Tracking** — Vehicle positions update in real time on a dark-themed CartoDB map
- **Color-Coded Markers** — Green for active vehicles, red for delayed/stationary
- **Anomaly Detection** — Backend flags vehicles with zero speed and broadcasts a Delayed status, triggering an alert banner on the frontend
- **Fleet Stats Bar** — Live counts of total vehicles, moving, delayed, and active alerts with fleet percentages
- **Vehicle Detail Cards** — Per-vehicle speed, route status, and live GPS coordinates
- **Activity Feed** — Scrollable log of recent fleet events and position changes
- **WebSocket Status Indicator** — Live connection state shown in the top bar

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│         (Vite + Leaflet + STOMP over SockJS)            │
│                  Vercel (CDN)                            │
└─────────────────────┬───────────────────────────────────┘
                      │ WebSocket (STOMP/SockJS over HTTPS)
                      │ Cloudflare Tunnel
┌─────────────────────▼───────────────────────────────────┐
│               Java Spring Boot Backend                   │
│                    AWS EC2 (t3.micro)                    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  FleetSimulatorService (@Scheduled, 2s interval) │    │
│  │  Generates telemetry → flags anomalies           │    │
│  │  Broadcasts delta via STOMP to /topic/fleet      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  WebSocketConfig (STOMP message broker)          │    │
│  │  Endpoint: /ws  │  Broker: /topic                │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Why WebSockets over polling?**
A traditional REST polling approach would have the frontend asking "any updates?" every N seconds — wasting bandwidth and introducing latency. STOMP over WebSockets inverts this: the server pushes only what changed the moment it changes. This is how live sports scores, trading platforms, and real dispatch systems work.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | Java 21 + Spring Boot | REST API, WebSocket broker, fleet simulation |
| WebSockets | STOMP over SockJS | Persistent bidirectional data stream |
| Frontend | React + Vite | UI, state management, WebSocket client |
| Map | React-Leaflet + CartoDB | Dark-themed live vehicle map |
| Backend Hosting | AWS EC2 (t3.micro) | Spring Boot JAR runtime |
| Frontend Hosting | Vercel | CDN deployment, auto-deploy on push |
| HTTPS Tunnel | Cloudflare Tunnel | Secure HTTPS bridge to EC2 backend |
| Build Tool | Maven (mvnw) | Java dependency management and packaging |

---

## Project Structure

```
livepulse/
├── backend/                          # Spring Boot application
│   └── src/main/java/com/etamwonkam/backend/
│       ├── config/
│       │   └── WebSocketConfig.java  # STOMP broker configuration
│       ├── model/
│       │   └── Vehicle.java          # Telemetry data model
│       ├── service/
│       │   └── FleetSimulatorService.java  # @Scheduled broadcast engine
│       └── BackendApplication.java
│
├── frontend/                         # React + Vite application
│   └── src/
│       └── App.jsx                   # Dashboard, map, WebSocket client
│
└── README.md
```

---

## Running Locally

**Prerequisites:** Java 21+, Node.js 18+, Maven

**Backend**
```bash
cd backend
./mvnw spring-boot:run
# Server starts on http://localhost:8080
# WebSocket available at ws://localhost:8080/ws
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# Dashboard opens at http://localhost:5173
```

No environment variables needed for local development — the frontend defaults to `localhost:8080`.

---

## Current State & Roadmap

LivePulse is a working, deployed real-time system. The current version uses a built-in fleet simulator to generate telemetry, which means it demonstrates the full WebSocket pipeline end-to-end without requiring external data sources.

**Planned additions:**
- **PostgreSQL persistence layer** — batch-write telemetry history to AWS RDS for route replay and historical analytics
- **Redis caching** — in-memory state store to reduce database write pressure under high-frequency updates
- **Route visualization** — polyline trail showing each vehicle's path over the last N minutes
- **Authentication** — JWT-based login for the ops dashboard

---

## Key Engineering Decisions

**Delta broadcasting over full-state snapshots**
The backend sends individual vehicle updates rather than the entire fleet state on every tick. This keeps WebSocket payloads small and ensures the frontend only re-renders what changed.

**SockJS fallback**
SockJS provides automatic fallback to HTTP long-polling if WebSocket connections are blocked by a corporate firewall — important for enterprise deployment contexts.

**Stateless simulator design**
The `FleetSimulatorService` maintains vehicle state in memory and applies anomaly detection logic (zero-speed = Delayed flag) before broadcasting. This separation of concerns means swapping the simulator for a real GPS ingestion endpoint requires changing only one class.

---

## Author

**Etam Wonkam**
- GitHub: [github.com/etamowon](https://github.com/etamowon)
- LinkedIn: [linkedin.com/in/etamw](https://www.linkedin.com/in/etamw/)
