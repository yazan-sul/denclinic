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

const TOOTH_MAPPING: Record<string, string> = {
    // Upper Right Quadrant (11-18)
    polySurface39052: "Tooth 12 - Lateral Incisor",
    polySurface39053: "Tooth 13 - Canine",
    polySurface39054: "Tooth 14 - First Premolar",
    polySurface39055: "Tooth 15 - Second Premolar",
    polySurface39056: "Tooth 16 - First Molar",
    polySurface39057: "Tooth 17 - Second Molar",
    polySurface39058: "Tooth 18 - Third Molar",

    // Upper Left Quadrant (21-28)
    polySurface39059: "Tooth 21 - Central Incisor",
    polySurface39060: "Tooth 22 - Lateral Incisor",
    polySurface39061: "Tooth 23 - Canine",
    polySurface39062: "Tooth 24 - First Premolar",
    polySurface39063: "Tooth 25 - Second Premolar",
    polySurface39064: "Tooth 26 - First Molar",
    polySurface39065: "Tooth 27 - Second Molar",
    polySurface39066: "Tooth 28 - Third Molar",

    // Lower Left Quadrant (31-38)
    polySurface39067: "Tooth 31 - Central Incisor",
    polySurface39068: "Tooth 32 - Lateral Incisor",
    polySurface39069: "Tooth 33 - Canine",
    polySurface39070: "Tooth 34 - First Premolar",
    polySurface39071: "Tooth 35 - Second Premolar",
    polySurface39072: "Tooth 36 - First Molar",
    polySurface39073: "Tooth 37 - Second Molar",
    polySurface39074: "Tooth 38 - Third Molar",

    // Lower Right Quadrant (41-48)
    polySurface39075: "Tooth 41 - Central Incisor",
    polySurface39076: "Tooth 42 - Lateral Incisor",
    polySurface39077: "Tooth 43 - Canine",
    polySurface39078: "Tooth 44 - First Premolar",
    polySurface39079: "Tooth 45 - Second Premolar",
    polySurface39080: "Tooth 46 - First Molar",
    polySurface39081: "Tooth 47 - Second Molar",
    polySurface39082: "Tooth 48 - Third Molar",
};

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
}

const NON_TOOTH_MESHES = new Set([
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

                if (child.name === externalSelectedTooth) {
                    const mat = (
                        Array.isArray(original) ? original[0] : original
                    ).clone();
                    (mat as THREE.MeshStandardMaterial).color.set(0x90ee90);
                    child.material = mat;
                } else if (child.name === externalHoveredTooth) {
                    const mat = (
                        Array.isArray(original) ? original[0] : original
                    ).clone();
                    (mat as THREE.MeshStandardMaterial).color.set(0x87ceeb);
                    child.material = mat;
                } else {
                    child.material = original;
                }
            }
        });
    }, [scene, externalHoveredTooth, externalSelectedTooth]);

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        const mesh = e.object as THREE.Mesh;
        if (NON_TOOTH_MESHES.has(mesh.name)) {
            onToothHover?.(null);
            return;
        }

        // Restore all other meshes to original
        originalMaterials.current.forEach((mat, uuid) => {
            const otherMesh = scene.getObjectByProperty("uuid", uuid) as THREE.Mesh;
            if (otherMesh && otherMesh !== mesh) {
                otherMesh.material = mat;
            }
        });

        // Change hover color
        mesh.material = (
            Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
        ).clone();
        (mesh.material as THREE.MeshStandardMaterial).color.set(0x87ceeb); // light blue

        onToothHover?.({
            mesh,
            name: mesh.name,
            displayName: TOOTH_MAPPING[mesh.name] || mesh.name,
        });
    };

    const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
        const mesh = e.object as THREE.Mesh;
        if (!NON_TOOTH_MESHES.has(mesh.name)) {
            // Restore original material
            const original = originalMaterials.current.get(mesh.uuid);
            if (original) mesh.material = original;
        }
        onToothHover?.(null);
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        const mesh = e.object as THREE.Mesh;
        if (NON_TOOTH_MESHES.has(mesh.name)) return;

        onToothClick?.({
            mesh,
            name: mesh.name,
            displayName: TOOTH_MAPPING[mesh.name] || mesh.name,
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
    onToothClick?: (tooth: ToothInfo) => void;
    onToothHover?: (tooth: ToothInfo | null) => void;
}

// Main viewer
export default function EnhancedTeethViewer({
    externalHoveredTooth,
    externalSelectedTooth,
    onToothClick,
    onToothHover,
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
                        url="/T.glb"
                        onToothClick={handleToothClick}
                        onToothHover={handleToothHover}
                        externalHoveredTooth={externalHoveredTooth}
                        externalSelectedTooth={externalSelectedTooth}
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