import { Suspense, useRef, useState } from 'react'
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

interface CasingData {
  depth: number
  outerDiameter: number // inches
  innerDiameter: number // inches
  type: 'conductor' | 'surface' | 'intermediate' | 'production'
  cementThickness: number // inches
}

interface BOPData {
  type: string
  pressureRating: number // psi
  stackHeight: number // meters
  status: 'open' | 'closed' | 'maintenance'
}

interface WellheadEquipment {
  christmasTree: {
    height: number
    width: number
    status: 'open' | 'closed'
  }
  masterValve: {
    position: number // 0-100%
    status: 'open' | 'closed'
  }
  wingValve: {
    position: number
    status: 'open' | 'closed'
  }
  chokeValve: {
    position: number
    status: 'open' | 'closed'
  }
  pressureGauges: Array<{
    name: string
    value: number
    unit: string
  }>
  flowMeter: {
    flowRate: number
    unit: string
  }
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
  bop?: BOPData
  casings?: CasingData[]
  wellheadEquipment?: WellheadEquipment
}

// Generate mock well data - moved outside component for reuse
function generateMockWellData(wellName: string): Well3DData {
  return {
    wellName,
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
    },
    bop: {
      type: 'Annular BOP',
      pressureRating: 10000,
      stackHeight: 3.5,
      status: 'open'
    },
    casings: [
      {
        depth: 200,
        outerDiameter: 20,
        innerDiameter: 18.5,
        type: 'conductor',
        cementThickness: 1.5
      },
      {
        depth: 800,
        outerDiameter: 13.375,
        innerDiameter: 12.415,
        type: 'surface',
        cementThickness: 1.2
      },
      {
        depth: 2000,
        outerDiameter: 9.625,
        innerDiameter: 8.681,
        type: 'intermediate',
        cementThickness: 1.0
      },
      {
        depth: 3000,
        outerDiameter: 7,
        innerDiameter: 6.276,
        type: 'production',
        cementThickness: 0.8
      }
    ],
    wellheadEquipment: {
      christmasTree: {
        height: 2.5,
        width: 1.2,
        status: 'open'
      },
      masterValve: {
        position: 100,
        status: 'open'
      },
      wingValve: {
        position: 75,
        status: 'open'
      },
      chokeValve: {
        position: 50,
        status: 'open'
      },
      pressureGauges: [
        { name: 'Wellhead Pressure', value: 2500 + Math.random() * 500, unit: 'psi' },
        { name: 'Tubing Pressure', value: 2300 + Math.random() * 400, unit: 'psi' },
        { name: 'Casing Pressure', value: 500 + Math.random() * 200, unit: 'psi' }
      ],
      flowMeter: {
        flowRate: 850 + Math.random() * 200,
        unit: 'bbl/day'
      }
    }
  }
}

// Wellhead Equipment Component - تجهیزات سر چاهی
function WellheadEquipment({ equipment, wellName }: { equipment?: WellheadEquipment; wellName: string }) {
  const [hovered, setHovered] = useState<string | null>(null)
  
  const defaultEquipment: WellheadEquipment = equipment || {
    christmasTree: {
      height: 2.5,
      width: 1.2,
      status: 'open'
    },
    masterValve: {
      position: 100,
      status: 'open'
    },
    wingValve: {
      position: 75,
      status: 'open'
    },
    chokeValve: {
      position: 50,
      status: 'open'
    },
    pressureGauges: [
      { name: 'Wellhead Pressure', value: 2500, unit: 'psi' },
      { name: 'Tubing Pressure', value: 2300, unit: 'psi' },
      { name: 'Casing Pressure', value: 500, unit: 'psi' }
    ],
    flowMeter: {
      flowRate: 850,
      unit: 'bbl/day'
    }
  }

  const bopHeight = 3.5
  const wellheadBaseY = bopHeight + 0.5

  return (
    <group position={[0, wellheadBaseY, 0]}>
      {/* Christmas Tree - درخت کریسمس */}
      <group
        onPointerOver={() => setHovered('christmasTree')}
        onPointerOut={() => setHovered(null)}
      >
        {/* Main Tree Body */}
        <mesh position={[0, defaultEquipment.christmasTree.height / 2, 0]}>
          <boxGeometry args={[defaultEquipment.christmasTree.width, defaultEquipment.christmasTree.height, defaultEquipment.christmasTree.width]} />
          <meshStandardMaterial 
            color={defaultEquipment.christmasTree.status === 'open' ? '#4169e1' : '#8b0000'}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Tree Branches (Valve Manifold) */}
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2
          const x = Math.cos(angle) * 0.6
          const z = Math.sin(angle) * 0.6
          return (
            <mesh key={i} position={[x, defaultEquipment.christmasTree.height * 0.7, z]}>
              <cylinderGeometry args={[0.1, 0.1, 0.4, 16]} />
              <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
            </mesh>
          )
        })}

        {/* Master Valve */}
        <mesh position={[0, defaultEquipment.christmasTree.height * 0.3, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.3, 16]} />
          <meshStandardMaterial 
            color={defaultEquipment.masterValve.status === 'open' ? '#00ff00' : '#ff0000'}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Wing Valves */}
        {[0, 1].map((i) => {
          const angle = (i / 2) * Math.PI
          const x = Math.cos(angle) * 0.5
          const z = Math.sin(angle) * 0.5
          return (
            <mesh key={i} position={[x, defaultEquipment.christmasTree.height * 0.5, z]}>
              <cylinderGeometry args={[0.12, 0.12, 0.25, 16]} />
              <meshStandardMaterial 
                color={defaultEquipment.wingValve.status === 'open' ? '#00ff00' : '#ff0000'}
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          )
        })}

        {/* Choke Valve */}
        <mesh position={[0.6, defaultEquipment.christmasTree.height * 0.5, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.3, 16]} />
          <meshStandardMaterial 
            color="#ffaa00"
            metalness={0.8}
            roughness={0.2}
          />
          {/* Choke Position Indicator */}
          <mesh position={[0, 0.2, 0]} rotation={[0, 0, (defaultEquipment.chokeValve.position / 100) * Math.PI * 2]}>
            <boxGeometry args={[0.05, 0.15, 0.05]} />
            <meshStandardMaterial color="#ffff00" />
          </mesh>
        </mesh>

        {/* Pressure Gauges */}
        {defaultEquipment.pressureGauges.map((gauge, i) => {
          const angle = (i / defaultEquipment.pressureGauges.length) * Math.PI * 2
          const x = Math.cos(angle) * 0.8
          const z = Math.sin(angle) * 0.8
          return (
            <group key={i} position={[x, defaultEquipment.christmasTree.height * 0.8, z]}>
              <mesh>
                <cylinderGeometry args={[0.1, 0.1, 0.1, 16]} />
                <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.3} />
              </mesh>
              <Text
                position={[0, 0.15, 0]}
                fontSize={0.08}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {gauge.value.toFixed(0)}
              </Text>
            </group>
          )
        })}

        {/* Flow Meter */}
        <group position={[0, defaultEquipment.christmasTree.height + 0.3, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 0.2, 0.2]} />
            <meshStandardMaterial color="#00ffff" metalness={0.6} roughness={0.4} />
          </mesh>
          <Text
            position={[0, 0, 0]}
            fontSize={0.1}
            color="#000000"
            anchorX="center"
            anchorY="middle"
          >
            {defaultEquipment.flowMeter.flowRate.toFixed(0)}
          </Text>
        </group>

        {hovered === 'christmasTree' && (
          <Html distanceFactor={10}>
            <div className="sensor-tooltip">
              <h4>Christmas Tree - {wellName}</h4>
              <p>Master Valve: {defaultEquipment.masterValve.status} ({defaultEquipment.masterValve.position}%)</p>
              <p>Wing Valve: {defaultEquipment.wingValve.status} ({defaultEquipment.wingValve.position}%)</p>
              <p>Choke Valve: {defaultEquipment.chokeValve.status} ({defaultEquipment.chokeValve.position}%)</p>
              <p>Flow Rate: {defaultEquipment.flowMeter.flowRate} {defaultEquipment.flowMeter.unit}</p>
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}

// BOP Component - Blow Out Preventer
function BOP({ bopData }: { bopData?: BOPData }) {
  const [hovered, setHovered] = useState(false)
  
  const defaultBOP: BOPData = bopData || {
    type: 'Annular BOP',
    pressureRating: 10000,
    stackHeight: 3.5,
    status: 'open'
  }

  const getColor = () => {
    switch (defaultBOP.status) {
      case 'closed': return '#ff0000'
      case 'maintenance': return '#ffaa00'
      default: return '#00ff00'
    }
  }

  return (
    <group position={[0, defaultBOP.stackHeight / 2 + 0.5, 0]}>
      {/* Main BOP Stack */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.6, 0.6, defaultBOP.stackHeight, 32]} />
        <meshStandardMaterial 
          color={getColor()}
          metalness={0.9}
          roughness={0.1}
          emissive={getColor()}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* BOP Stack Layers */}
      {[0, 1, 2].map((layer) => (
        <mesh
          key={layer}
          position={[0, (layer - 1) * 1.1, 0]}
        >
          <cylinderGeometry args={[0.65, 0.65, 0.3, 32]} />
          <meshStandardMaterial 
            color="#333333"
            metalness={0.95}
            roughness={0.05}
          />
        </mesh>
      ))}

      {/* BOP Control Lines */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 0.7,
              defaultBOP.stackHeight / 2,
              Math.sin(angle) * 0.7
            ]}
          >
            <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
            <meshStandardMaterial color="#ffaa00" />
          </mesh>
        )
      })}

      {hovered && (
        <Html distanceFactor={10}>
          <div className="sensor-tooltip">
            <h4>BOP - Blow Out Preventer</h4>
            <p>Type: {defaultBOP.type}</p>
            <p>Pressure Rating: {defaultBOP.pressureRating.toLocaleString()} psi</p>
            <p>Stack Height: {defaultBOP.stackHeight.toFixed(1)} m</p>
            <p>Status: {defaultBOP.status.toUpperCase()}</p>
          </div>
        </Html>
      )}
    </group>
  )
}

// Casing Component - نمایش لوله‌های Casing
function Casing({ casing }: { casing: CasingData }) {
  const [hovered, setHovered] = useState(false)
  const radius = casing.outerDiameter / 24 // Convert inches to meters (approximate)
  const innerRadius = casing.innerDiameter / 24
  const casingLength = casing.depth
  const cementRadius = radius + casing.cementThickness / 24

  const getCasingColor = () => {
    switch (casing.type) {
      case 'conductor': return '#8b4513'
      case 'surface': return '#4169e1'
      case 'intermediate': return '#32cd32'
      case 'production': return '#ff6347'
      default: return '#808080'
    }
  }

  return (
    <group position={[0, -casingLength / 2, 0]}>
      {/* Cement Layer (outside casing) */}
      <mesh>
        <cylinderGeometry args={[cementRadius, cementRadius, casingLength, 32]} />
        <meshStandardMaterial 
          color="#c0c0c0"
          metalness={0.3}
          roughness={0.8}
          opacity={0.6}
          transparent
        />
      </mesh>

      {/* Outer Casing */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[radius, radius, casingLength, 32]} />
        <meshStandardMaterial 
          color={getCasingColor()}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Inner Casing (hollow - shows previous casing or wellbore) */}
      <mesh>
        <cylinderGeometry args={[innerRadius, innerRadius, casingLength, 32]} />
        <meshStandardMaterial 
          color="#1a1a1a"
          side={THREE.BackSide}
        />
      </mesh>

      {/* Casing Label */}
      <Text
        position={[cementRadius + 0.3, -casingLength / 2, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
      >
        {casing.type.toUpperCase()}
      </Text>

      {/* Size Label */}
      <Text
        position={[cementRadius + 0.3, -casingLength / 2 + 0.2, 0]}
        fontSize={0.12}
        color="#ffff00"
        anchorX="left"
        anchorY="middle"
      >
        {casing.outerDiameter}" OD / {casing.innerDiameter}" ID
      </Text>

      {/* Cement Label */}
      <Text
        position={[cementRadius + 0.3, -casingLength / 2 + 0.4, 0]}
        fontSize={0.1}
        color="#c0c0c0"
        anchorX="left"
        anchorY="middle"
      >
        Cement: {casing.cementThickness}" ({casing.cementThickness * 25.4}mm)
      </Text>

      {hovered && (
        <Html distanceFactor={10}>
          <div className="sensor-tooltip">
            <h4>Casing: {casing.type.toUpperCase()}</h4>
            <p>Depth: 0 - {casing.depth.toFixed(1)} m</p>
            <p>Outer Diameter: {casing.outerDiameter}" ({casing.outerDiameter * 25.4}mm)</p>
            <p>Inner Diameter: {casing.innerDiameter}" ({casing.innerDiameter * 25.4}mm)</p>
            <p>Cement Thickness: {casing.cementThickness}" ({casing.cementThickness * 25.4}mm)</p>
            <p>Wall Thickness: {((casing.outerDiameter - casing.innerDiameter) / 2).toFixed(2)}"</p>
          </div>
        </Html>
      )}
    </group>
  )
}

// Wellbore component - نمایش لوله چاه
function Wellbore({ depth, data, casings }: { depth: number; data: DepthData[]; casings?: CasingData[] }) {
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
      {/* Render casings first (they're larger, nested from outside to inside) */}
      {casings && casings.map((casing, index) => (
        <Casing key={index} casing={casing} />
      ))}

      {/* Main wellbore cylinder (only if no casings or as inner liner) */}
      {(!casings || casings.length === 0) && (
        <mesh ref={meshRef} position={[0, -depth / 2, 0]}>
          <cylinderGeometry args={[radius, radius, depth, 32]} />
          <meshStandardMaterial color="#2c3e50" metalness={0.3} roughness={0.7} />
        </mesh>
      )}

      {/* Depth segments with status colors (inside casings) */}
      {data.map((segment, index) => {
        const segmentDepth = depth / data.length
        const yPosition = -(index * segmentDepth + segmentDepth / 2)
        const color = getColor(segment.status)
        const innerRadius = casings && casings.length > 0 
          ? (casings[casings.length - 1]?.innerDiameter || 0) / 24 * 0.8
          : radius * 0.8

        return (
          <mesh
            key={index}
            position={[0, yPosition, 0]}
          >
            <cylinderGeometry args={[innerRadius, innerRadius, segmentDepth, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
              metalness={0.5}
              roughness={0.5}
              transparent
              opacity={0.7}
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

  useFrame(() => {
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

// Multiple Wells Scene - نمایش چند چاه
function MultipleWellsScene({ wellsData, wells }: { wellsData: Record<string, Well3DData>; wells: string[] }) {
  const controlsRef = useRef<any>(null)
  const spacing = 15 // فاصله بین چاه‌ها

  return (
    <>
      <PerspectiveCamera makeDefault position={[30, 20, 30]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={100}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />

      {/* Ground plane - بزرگتر برای چند چاه */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#3a5f3a" />
      </mesh>

      {/* Render all wells */}
      {wells.map((wellName, index) => {
        // Use mock data if wellData is not available
        const wellData = wellsData[wellName] || generateMockWellData(wellName)

        const row = Math.floor(index / 2)
        const col = index % 2
        const x = (col - 0.5) * spacing
        const z = (row - 0.5) * spacing

        return (
          <group key={wellName} position={[x, 0, z]}>
            {/* Well Label */}
            <Text
              position={[0, 5, 0]}
              fontSize={0.5}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              {wellName}
            </Text>

            {/* BOP */}
            <BOP bopData={wellData.bop} />

            {/* Wellbore */}
            <Wellbore depth={wellData.totalDepth} data={wellData.depthData} casings={wellData.casings} />

            {/* Wellhead Equipment */}
            <WellheadEquipment equipment={wellData.wellheadEquipment} wellName={wellName} />
          </group>
        )
      })}

      <Environment preset="sunset" />
    </>
  )
}

// Main 3D Scene - Single Well
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

      {/* BOP - Blow Out Preventer */}
      <BOP bopData={data.bop} />

      {/* Wellbore with Casings */}
      <Wellbore depth={data.totalDepth} data={data.depthData} casings={data.casings} />

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

      {/* Wellhead Equipment - تجهیزات سر چاهی */}
      <WellheadEquipment equipment={data.wellheadEquipment} wellName={data.wellName} />

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
  const [viewMode, setViewMode] = useState<'single' | 'multiple'>('single')

  // Fetch list of wells from Wells page data
  const { data: wellsResponse } = useQuery({
    queryKey: ['wells-list-3d'],
    queryFn: async () => {
      try {
        const response = await well3DAPI.getWells()
        return Array.isArray(response) ? response : response?.wells || []
      } catch (error) {
        if (import.meta.env.DEV) {
          console.debug('Wells service unavailable')
        }
        // Fallback to default wells
        return ['PROD-001', 'PROD-002', 'DEV-001', 'OBS-001']
      }
    },
  })

  const wells: string[] = Array.isArray(wellsResponse) && wellsResponse.length > 0
    ? wellsResponse
    : ['PROD-001', 'PROD-002', 'DEV-001', 'OBS-001']

  // Fetch well data for selected well
  const { data: wellData, isLoading, error } = useQuery({
    queryKey: ['well3d', selectedWell],
    queryFn: () => well3DAPI.getWellData(selectedWell),
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  // Fetch data for all wells (for multiple view)
  const { data: allWellsData } = useQuery({
    queryKey: ['wells3d-all', wells],
    queryFn: async () => {
      const wellsData: Record<string, Well3DData> = {}
      for (const wellName of wells) {
        try {
          const data = await well3DAPI.getWellData(wellName)
          // Use mock data if API returns null/undefined (network error)
          wellsData[wellName] = data ?? generateMockWellData(wellName)
        } catch (error) {
          // Use mock data if API fails
          wellsData[wellName] = generateMockWellData(wellName)
        }
      }
      return wellsData
    },
    enabled: viewMode === 'multiple',
  })


  if (isLoading && viewMode === 'single') {
    return (
      <div className="well3d-container">
        <div className="loading">Loading 3D visualization...</div>
      </div>
    )
  }

  if (error && viewMode === 'single') {
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
  const displayData: Well3DData = wellData ?? generateMockWellData(selectedWell)

  return (
    <div className="well3d-container">
      <div className="well3d-controls">
        <div className="control-group">
          <label>View Mode:</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'single' | 'multiple')}
          >
            <option value="single">Single Well</option>
            <option value="multiple">All Wells</option>
          </select>
        </div>
        {viewMode === 'single' && (
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
        )}
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
          {viewMode === 'single' ? (
            <>
              <h2>{displayData.wellName}</h2>
              <p>Total Depth: {displayData.totalDepth.toFixed(0)} m</p>
            </>
          ) : (
            <>
              <h2>All Wells ({wells.length})</h2>
              <p>Total Wells: {wells.length}</p>
            </>
          )}
        </div>
      </div>

      <div className="well3d-viewport">
        <Canvas className="well3d-canvas" shadows>
          <Suspense fallback={null}>
            {viewMode === 'single' ? (
              <WellScene data={displayData} />
            ) : (
              <MultipleWellsScene wellsData={allWellsData || {}} wells={wells} />
            )}
          </Suspense>
        </Canvas>
      </div>

      <div className="well3d-legend">
        <div className="legend-section">
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
        
        {displayData.bop && (
          <div className="legend-section">
            <h3>BOP Status</h3>
            <div className="legend-item">
              <div className="legend-color" style={{ background: displayData.bop.status === 'open' ? '#00ff00' : displayData.bop.status === 'closed' ? '#ff0000' : '#ffaa00' }}></div>
              <span>{displayData.bop.type} - {displayData.bop.status.toUpperCase()}</span>
            </div>
            <div className="legend-item">
              <span style={{ fontSize: '12px', opacity: 0.8 }}>Rating: {displayData.bop.pressureRating.toLocaleString()} psi</span>
            </div>
          </div>
        )}

        {displayData.casings && displayData.casings.length > 0 && (
          <div className="legend-section">
            <h3>Casing Types</h3>
            {displayData.casings.map((casing, index) => {
              const getCasingColor = () => {
                switch (casing.type) {
                  case 'conductor': return '#8b4513'
                  case 'surface': return '#4169e1'
                  case 'intermediate': return '#32cd32'
                  case 'production': return '#ff6347'
                  default: return '#808080'
                }
              }
              return (
                <div key={index} className="legend-item">
                  <div className="legend-color" style={{ background: getCasingColor() }}></div>
                  <span>{casing.type.toUpperCase()}: {casing.outerDiameter}" OD / {casing.innerDiameter}" ID (0-{casing.depth}m)</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

