import { formatTime } from "@/components/art-clock/art-clock";
import {
  CONTINENT_NAMES,
  CONTINENT_OUTLINES,
} from "@/components/art-clock/states/continent-outlines";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { Billboard, Line, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const ROTATION_SPEED_PER_FRAME = (2 * Math.PI) / (60 * 60);
const GLOBE_RADIUS = 2.2;
const GRID_SEGMENTS = 48;
const CONTINENT_SEGMENTS_PER_EDGE = 3;

const CITIES = [
  { name: "LONDON", lat: 51.5, lng: -0.1, tz: "Europe/London" },
  { name: "SHANGHAI", lat: 31.2, lng: 121.5, tz: "Asia/Shanghai" },
  { name: "BARCELONA", lat: 41.4, lng: 2.2, tz: "Europe/Madrid" },
  { name: "NEW YORK", lat: 40.7, lng: -74.0, tz: "America/New_York" },
  { name: "LOS ANGELES", lat: 34.1, lng: -118.2, tz: "America/Los_Angeles" },
  { name: "HAWAII", lat: 21.3, lng: -157.8, tz: "Pacific/Honolulu" },
] as const;

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function getUtcOffset(tz: string): string {
  try {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    const tzStr = now.toLocaleString("en-US", { timeZone: tz });
    const tzMs = new Date(tzStr).getTime();
    const offsetHours = Math.round((tzMs - utcMs) / 3_600_000);
    const sign = offsetHours >= 0 ? "+" : "";
    return `${sign}${offsetHours}`;
  } catch {
    return "";
  }
}

function cityTimeInfo(tz: string): { time: string; period: string; offset: string } {
  try {
    const now = new Date();
    const localized = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const { hours, minutes, period } = formatTime(localized);
    const offset = getUtcOffset(tz);
    return { time: `${hours}:${minutes}`, period, offset };
  } catch {
    const { hours, minutes, period } = formatTime(new Date());
    return { time: `${hours}:${minutes}`, period, offset: "" };
  }
}

function ContinentLines({ color }: { color: string }) {
  const points = useMemo(() => {
    return CONTINENT_OUTLINES.map((outline) => {
      const linePoints: [number, number, number][] = [];
      for (let i = 0; i < outline.length - 1; i++) {
        const [lat1, lng1] = outline[i];
        const [lat2, lng2] = outline[i + 1];
        for (let s = 0; s < CONTINENT_SEGMENTS_PER_EDGE; s++) {
          const t = s / CONTINENT_SEGMENTS_PER_EDGE;
          const lat = lat1 + (lat2 - lat1) * t;
          const lng = lng1 + (lng2 - lng1) * t;
          const v = latLngToVec3(lat, lng, GLOBE_RADIUS + 0.005);
          linePoints.push([v.x, v.y, v.z]);
        }
      }
      const last = outline[outline.length - 1];
      const v = latLngToVec3(last[0], last[1], GLOBE_RADIUS + 0.005);
      linePoints.push([v.x, v.y, v.z]);
      return linePoints;
    });
  }, []);

  return (
    <>
      {points.map((pts, i) => (
        <Line
          key={CONTINENT_NAMES[i]}
          points={pts}
          color={color}
          lineWidth={1.5}
          transparent
          opacity={0.85}
        />
      ))}
    </>
  );
}

function CityLabel({
  city,
  foreground,
  background,
}: { city: (typeof CITIES)[number]; foreground: string; background: string }) {
  const pos = latLngToVec3(city.lat, city.lng, GLOBE_RADIUS);
  const labelPos = latLngToVec3(city.lat, city.lng, GLOBE_RADIUS + 0.45);
  const info = cityTimeInfo(city.tz);

  return (
    <group>
      <mesh position={pos}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={foreground} />
      </mesh>
      <Billboard position={labelPos}>
        {/* Background plane behind text */}
        <mesh position={[0, 0, -0.001]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshBasicMaterial color={background} transparent opacity={0.9} />
        </mesh>
        <Text
          fontSize={0.1}
          color={foreground}
          anchorX="center"
          anchorY="bottom"
          position={[0, 0.01, 0]}
          fontWeight="bold"
        >
          {city.name}
        </Text>
        <Text
          fontSize={0.08}
          color={foreground}
          anchorX="center"
          anchorY="top"
          position={[0, -0.02, 0]}
        >
          {`${info.time} ${info.period}  UTC${info.offset}`}
        </Text>
      </Billboard>
      <Line
        points={[pos.toArray(), labelPos.toArray()]}
        color={foreground}
        lineWidth={0.5}
        transparent
        opacity={0.4}
      />
    </group>
  );
}

function Globe({ foreground, background }: { foreground: string; background: string }) {
  const groupRef = useRef<THREE.Group>(null);
  // Muted version of foreground for wireframe sphere
  const wireframeColor = useMemo(() => {
    // Mix foreground toward background for a subtle wireframe
    return foreground;
  }, [foreground]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += ROTATION_SPEED_PER_FRAME;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Subtle wireframe sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, GRID_SEGMENTS, GRID_SEGMENTS]} />
        <meshBasicMaterial wireframe color={wireframeColor} transparent opacity={0.15} />
      </mesh>

      {/* Continent outlines */}
      <ContinentLines color={foreground} />

      {/* City markers */}
      {CITIES.map((city) => (
        <CityLabel key={city.name} city={city} foreground={foreground} background={background} />
      ))}
    </group>
  );
}

export function WireframeGlobe() {
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const [canvasReady, setCanvasReady] = useState(false);
  const { foreground, background } = useClockColors();

  return (
    <div className="absolute inset-0 bg-background">
      <div
        className="transition-opacity duration-700"
        style={{
          height: "70%",
          width: "100%",
          opacity: canvasReady ? 1 : 0,
          pointerEvents: "none",
        }}
      >
        <Canvas
          orthographic
          camera={{ position: [0, 0, 5], zoom: 130 }}
          onCreated={() => setCanvasReady(true)}
        >
          <Globe foreground={foreground} background={background} />
        </Canvas>
      </div>

      <div
        data-testid="globe-time-overlay"
        className="absolute bottom-16 left-0 right-0 flex items-baseline justify-center gap-1 text-foreground"
        style={{ fontWeight: 100 }}
      >
        <span className="text-9xl">{hours}</span>
        <span className="text-9xl">:</span>
        <span className="text-9xl">{minutes}</span>
        <span className="ml-2 text-5xl" style={{ fontWeight: 200 }}>
          {period}
        </span>
      </div>
    </div>
  );
}
