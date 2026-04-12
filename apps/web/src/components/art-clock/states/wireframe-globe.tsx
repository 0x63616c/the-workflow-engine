import { formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { Billboard, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const ROTATION_SPEED_PER_FRAME = (2 * Math.PI) / (60 * 60);
const GLOBE_RADIUS = 1.5;
const GRID_SEGMENTS = 32;

const CITIES = [
  { name: "LONDON", lat: 51.5, lng: -0.1, tz: "Europe/London" },
  { name: "SHANGHAI", lat: 31.2, lng: 121.5, tz: "Asia/Shanghai" },
  { name: "BARCELONA", lat: 41.4, lng: 2.2, tz: "Europe/Madrid" },
  { name: "NEW YORK", lat: 40.7, lng: -74.0, tz: "America/New_York" },
  { name: "LOS ANGELES", lat: 34.1, lng: -118.2, tz: "America/Los_Angeles" },
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

function cityTime(tz: string): string {
  try {
    const now = new Date();
    const localized = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const { hours, minutes } = formatTime(localized);
    return `${hours}:${minutes}`;
  } catch {
    const { hours, minutes } = formatTime(new Date());
    return `${hours}:${minutes}`;
  }
}

function Globe() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += ROTATION_SPEED_PER_FRAME;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, GRID_SEGMENTS, GRID_SEGMENTS]} />
        <meshBasicMaterial wireframe color="white" />
      </mesh>

      {CITIES.map((city) => {
        const pos = latLngToVec3(city.lat, city.lng, GLOBE_RADIUS);
        const labelPos = latLngToVec3(city.lat, city.lng, GLOBE_RADIUS + 0.35);
        return (
          <group key={city.name}>
            <mesh position={pos}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="white" />
            </mesh>
            <Billboard position={labelPos}>
              <Text
                fontSize={0.09}
                color="white"
                anchorX="center"
                anchorY="middle"
                font="/fonts/GeistVF.woff"
              >
                {`${city.name}  ${cityTime(city.tz)}`}
              </Text>
            </Billboard>
            <Line points={[pos.toArray(), labelPos.toArray()]} color="white" lineWidth={0.5} />
          </group>
        );
      })}
    </group>
  );
}

export function WireframeGlobe() {
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);

  return (
    <div className="absolute inset-0 bg-black">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 120 }}
        style={{ height: "66%", width: "100%" }}
      >
        <OrbitControls enabled={false} />
        <Globe />
      </Canvas>

      <div
        data-testid="globe-time-overlay"
        className="absolute bottom-16 left-0 right-0 flex items-baseline justify-center gap-1 text-white"
        style={{ fontWeight: 100 }}
      >
        <span className="text-8xl">{hours}</span>
        <span className="text-8xl">:</span>
        <span className="text-8xl">{minutes}</span>
        <span className="ml-2 text-4xl" style={{ fontWeight: 200 }}>
          {period}
        </span>
      </div>
    </div>
  );
}
