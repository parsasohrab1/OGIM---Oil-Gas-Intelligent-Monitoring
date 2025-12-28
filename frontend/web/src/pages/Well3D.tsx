import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Html, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useQuery } from '@tanstack/react-query'
import { well3DAPI } from '../api/services'
import './Well3D.css'

interface DepthData {
  depth: number
  pressure: number
  temperature: number
  flowRate: number
  status: 'normal' | 'warning' | 'critical'
}

interface Well3DData {
  wellName: string
  totalDepth: number
  depthData: DepthData[]
  surfaceData: {
    wellheadPressure: number
    wellheadTemperature: number
    flowRate: number
  }
}

// Wellbore component - نمایش لوله چاه
function Wellbore({ depth, data }: { depth: number; data: DepthData[] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const segments = 50
  const radius = 0.3

  // Create color based on status
  const getColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ff0000'
      case 'warning': return '#ffaa00'
      default: return '#4a90e2'
    }
  }

  // Create geometry for wellbore
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const y = -(i / segments) * depth
    points.push(new THREE.Vector3(0, y, 0))
  }

  return (
    <group>
      {/* Main wellbore cylinder */}
      <mesh ref={meshRef} position={[0, -depth / 2, 0]}>
        <cylinderGeometry args={[radius, radius, depth, 32]} />
        <meshStandardMaterial color="#2c3e50" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Depth segments with status colors */}
      {data.map((segment, index) => {
        const segmentDepth = depth / data.length
        const yPosition = -(index * segmentDepth + segmentDepth / 2)
        const color = getColor(segment.status)

        return (
          <mesh
            key={index}
            position={[0, yPosition, 0]}
          >
            <cylinderGeometry args={[radius * 1.1, radius * 1.1, segmentDepth, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// Sensor point component - نمایش نقاط سنسور
function SensorPoint({
  position,
  depth,
  data,
  label
}: {
  position: [number, number, number]
  depth: number
  data: DepthData
  label: string
}) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01
    }
  })

  const getColor = () => {
    switch (data.status) {
      case 'critical': return '#ff0000'
      case 'warning': return '#ffaa00'
      default: return '#00ff00'
    }
  }

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.5 : 1}
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={0.5}
        />
      </mesh>
      {hovered && (
        <Html distanceFactor={10}>
          <div className="sensor-tooltip">
            <h4>{label}</h4>
            <p>Depth: {depth.toFixed(1)} m</p>
            <p>Pressure: {data.pressure.toFixed(2)} psi</p>
            <p>Temperature: {data.temperature.toFixed(1)} °C</p>
            <p>Flow Rate: {data.flowRate.toFixed(2)} bbl/day</p>
            <p>Status: {data.status}</p>
          </div>
        </Html>
      )}
    </group>
  )
}

// Depth labels - برچسب‌های عمق
function DepthLabels({ depth, segments }: { depth: number; segments: number }) {
  const labels = []
  for (let i = 0; i <= segments; i++) {
    const y = -(i / segments) * depth
    const depthValue = (i / segments) * depth

    labels.push(
      <Text
        key={i}
        position={[0.8, y, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
      >
        {depthValue.toFixed(0)}m
      </Text>
    )
  }
  return <group>{labels}</group>
}

// Main 3D Scene
function WellScene({ data }: { data: Well3DData }) {
  const controlsRef = useRef<any>(null)

  // Calculate sensor positions at different depths
  const sensorPositions = data.depthData.map((segment, index) => {
    const depth = (index / data.depthData.length) * data.totalDepth
    const angle = (index / data.depthData.length) * Math.PI * 2
    const radius = 0.5
    return {
      position: [
        Math.cos(angle) * radius,
        -depth,
        Math.sin(angle) * radius
      ] as [number, number, number],
      depth,
      data: segment
    }
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[5, 2, 5]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#3a5f3a" />
      </mesh>

      {/* Wellbore */}
      <Wellbore depth={data.totalDepth} data={data.depthData} />

      {/* Depth labels */}
      <DepthLabels depth={data.totalDepth} segments={10} />

      {/* Sensor points */}
      {sensorPositions.map((sensor, index) => (
        <SensorPoint
          key={index}
          position={sensor.position}
          depth={sensor.depth}
          data={sensor.data}
          label={`Sensor ${index + 1}`}
        />
      ))}

      {/* Wellhead equipment */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.4, 16]} />
        <meshStandardMaterial color="#8b4513" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Surface data display */}
      <Html position={[2, 2, 0]} distanceFactor={5}>
        <div className="surface-data-panel">
          <h3>Surface Data</h3>
          <div className="data-row">
            <span>Wellhead Pressure:</span>
            <span>{data.surfaceData.wellheadPressure.toFixed(2)} psi</span>
          </div>
          <div className="data-row">
            <span>Wellhead Temperature:</span>
            <span>{data.surfaceData.wellheadTemperature.toFixed(1)} °C</span>
          </div>
          <div className="data-row">
            <span>Flow Rate:</span>
            <span>{data.surfaceData.flowRate.toFixed(2)} bbl/day</span>
          </div>
        </div>
      </Html>

      {/* Environment */}
      <Environment preset="sunset" />
    </>
  )
}

export default function Well3D() {
  const [selectedWell, setSelectedWell] = useState<string>('PROD-001')
  const [autoRotate, setAutoRotate] = useState(false)

  // Fetch well data
  const { data: wellData, isLoading, error } = useQuery({
    queryKey: ['well3d', selectedWell],
    queryFn: () => well3DAPI.getWellData(selectedWell),
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  // Mock wells list
  const wells = ['PROD-001', 'PROD-002', 'INJ-001', 'OBS-001']

  if (isLoading) {
    return (
      <div className="well3d-container">
        <div className="loading">Loading 3D visualization...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="well3d-container">
        <div className="error">Error loading well data. Using mock data...</div>
        {wellData && (
          <Canvas className="well3d-canvas">
            <Suspense fallback={null}>
              <WellScene data={wellData} />
            </Suspense>
          </Canvas>
        )}
      </div>
    )
  }

  // Use mock data if API fails
  const displayData = wellData || {
    wellName: selectedWell,
    totalDepth: 3000,
    depthData: Array.from({ length: 20 }, (_, i) => ({
      depth: (i / 20) * 3000,
      pressure: 1000 + (i / 20) * 2000 + Math.random() * 100,
      temperature: 25 + (i / 20) * 100 + Math.random() * 10,
      flowRate: 100 + Math.random() * 50,
      status: Math.random() > 0.8 ? 'warning' : Math.random() > 0.95 ? 'critical' : 'normal'
    })),
    surfaceData: {
      wellheadPressure: 500 + Math.random() * 100,
      wellheadTemperature: 30 + Math.random() * 10,
      flowRate: 150 + Math.random() * 50
    }
  }

  return (
    <div className="well3d-container">
      <div className="well3d-controls">
        <div className="control-group">
          <label>Select Well:</label>
          <select
            value={selectedWell}
            onChange={(e) => setSelectedWell(e.target.value)}
          >
            {wells.map((well) => (
              <option key={well} value={well}>
                {well}
              </option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
            />
            Auto Rotate
          </label>
        </div>
        <div className="well-info">
          <h2>{displayData.wellName}</h2>
          <p>Total Depth: {displayData.totalDepth.toFixed(0)} m</p>
        </div>
      </div>

      <div className="well3d-viewport">
        <Canvas className="well3d-canvas" shadows>
          <Suspense fallback={null}>
            <WellScene data={displayData} />
          </Suspense>
        </Canvas>
      </div>

      <div className="well3d-legend">
        <h3>Status Legend</h3>
        <div className="legend-item">
          <div className="legend-color normal"></div>
          <span>Normal</span>
        </div>
        <div className="legend-item">
          <div className="legend-color warning"></div>
          <span>Warning</span>
        </div>
        <div className="legend-item">
          <div className="legend-color critical"></div>
          <span>Critical</span>
        </div>
      </div>
    </div>
  )
}

