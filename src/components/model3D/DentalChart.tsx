import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import {
    OrbitControls as DreiOrbitControls,
    useGLTF,
    Center,
    PerspectiveCamera,
    Html,
} from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as DreiOrbitControlsType } from "three-stdlib";
import {
    TOOTH_MESH_TO_NAME,
    TOOTH_MESH_TO_NUMBER,
} from "./toothMapping";

export type ToothStatus = "HEALTHY" | "DECAYED" | "FILLED" | "CROWN" | "MISSING";

// Tooth info type
interface ToothInfo {
    mesh: THREE.Mesh;
    name: string;
    displayName: string;
}

// Model component
interface ModelProps {
    url: string;
    onToothClick?: (tooth: ToothInfo) => void;
    onToothHover?: (tooth: ToothInfo | null) => void;
    externalHoveredTooth?: string | null;
    externalSelectedTooth?: string | null;
    selectedTeeth?: string[];
    toothStatuses?: Record<number, ToothStatus | null>;
}

const NON_TOOTH_MESHES = new Set([
    "upper",
    "lower",
    "tounge",
    "polySurface53001",
    "polySurface53018",
    "polySurface39001",
    "polySurface39010",
    "polySurface44001",
    "polySurface44002",
    "polySurface39051",
    "polySurface53051",
    "polySurface44003",
]);

function Model({
    url,
    onToothClick,
    onToothHover,
    externalHoveredTooth,
    externalSelectedTooth,
    selectedTeeth,
    toothStatuses,
}: ModelProps) {
    const { scene } = useGLTF(url);

    // Store original materials to restore after hover
    const originalMaterials = useRef<
        Map<string, THREE.Material | THREE.Material[]>
    >(new Map());

    // Initialize original materials once
    useEffect(() => {
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                originalMaterials.current.set(child.uuid, child.material);
            }
        });
    }, [scene]);

    useEffect(() => {
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && !NON_TOOTH_MESHES.has(child.name)) {
                const original = originalMaterials.current.get(child.uuid);
                if (!original) return;

                if (child.name === externalHoveredTooth) {
                    const mat = (
                        Array.isArray(original) ? original[0] : original
                    ).clone();
                    (mat as THREE.MeshStandardMaterial).color.set(0x87ceeb);
                    child.material = mat;
                    return;
                }

                if (child.name === externalSelectedTooth || selectedTeeth?.includes(child.name)) {
                    const mat = (
                        Array.isArray(original) ? original[0] : original
                    ).clone();
                    (mat as THREE.MeshStandardMaterial).color.set(0x90ee90);
                    child.material = mat;
                    return;
                }

                const toothNumber = TOOTH_MESH_TO_NUMBER[child.name];
                const status = toothNumber ? toothStatuses?.[toothNumber] : null;
                if (status && status !== "HEALTHY") {
                    const mat = (
                        Array.isArray(original) ? original[0] : original
                    ).clone();
                    const color = status === "DECAYED"
                        ? 0xf87171
                        : status === "FILLED"
                            ? 0x60a5fa
                            : status === "CROWN"
                                ? 0xfbbf24
                                : 0x9ca3af;
                    (mat as THREE.MeshStandardMaterial).color.set(color);
                    child.material = mat;
                } else {
                    child.material = original;
                }
            }
        });
    }, [scene, externalHoveredTooth, externalSelectedTooth, selectedTeeth, toothStatuses]);

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        const mesh = e.object as THREE.Mesh;
        if (NON_TOOTH_MESHES.has(mesh.name)) {
            onToothHover?.(null);
            return;
        }

        onToothHover?.({
            mesh,
            name: mesh.name,
            displayName: TOOTH_MESH_TO_NAME[mesh.name] || mesh.name,
        });
    };

    const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
        onToothHover?.(null);
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        const mesh = e.object as THREE.Mesh;
        if (NON_TOOTH_MESHES.has(mesh.name)) return;
        console.log("Clicked tooth mesh:", mesh.name);

        onToothClick?.({
            mesh,
            name: mesh.name,
            displayName: TOOTH_MESH_TO_NAME[mesh.name] || mesh.name,
        });
    };

    return (
        <Center>
            <primitive
                object={scene}
                onPointerMove={handlePointerMove}
                onPointerOut={handlePointerOut}
                onClick={handleClick}
            />
        </Center>
    );
}

function Loader() {
    return (
        <Html center>
            <div className="text-white text-lg">Loading 3D Model...</div>
        </Html>
    );
}

interface EnhancedTeethViewerProps {
    externalHoveredTooth?: string | null;
    externalSelectedTooth?: string | null;
    selectedTeeth?: string[];
    onToothClick?: (tooth: ToothInfo) => void;
    onToothHover?: (tooth: ToothInfo | null) => void;
    toothStatuses?: Record<number, ToothStatus | null>;
}

// Main viewer
export default function EnhancedTeethViewer({
    externalHoveredTooth,
    externalSelectedTooth,
    selectedTeeth,
    onToothClick,
    onToothHover,
    toothStatuses,
}: EnhancedTeethViewerProps = {}) {
    const [selectedTooth, setSelectedTooth] = useState<ToothInfo | null>(null);
    const [hoveredTooth, setHoveredTooth] = useState<ToothInfo | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Properly typed OrbitControls ref
    const controlsRef = useRef<DreiOrbitControlsType>(null);

    const handleToothClick = (tooth: ToothInfo) => {
        setSelectedTooth(tooth);
        onToothClick?.(tooth);
    };

    const handleToothHover = (tooth: ToothInfo | null) => {
        setHoveredTooth(tooth);
        onToothHover?.(tooth);
    };

    return (
        <div className="relative w-full h-full">
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 0.2]} fov={50} near={0.001} />

                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 2, 2]} intensity={1} />

                <Suspense fallback={<Loader />}>
                    <Model
                        url="/model-v2.glb"
                        onToothClick={handleToothClick}
                        onToothHover={handleToothHover}
                        externalHoveredTooth={externalHoveredTooth}
                        externalSelectedTooth={externalSelectedTooth}
                        selectedTeeth={selectedTeeth}
                        toothStatuses={toothStatuses}
                    />
                </Suspense>
                <DreiOrbitControls
                    ref={controlsRef}
                    target={isMobile ? [0, -0.03, 0] : [0, 0, 0]}
                    enablePan={false}
                    enableZoom={false}
                    enableRotate={true}
                />
            </Canvas>
        </div>
    );
}