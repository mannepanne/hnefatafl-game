import { useRef, useMemo, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import type { Piece } from '@/types/game';
import { getTextureUrl } from '@/hooks/usePieceTextures';
import type { PieceType } from '@/hooks/usePieceTextures';

// ─── Alpha-mask shader (removes white backgrounds) ────────

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTextureFront;
  uniform sampler2D uTextureBack;
  uniform vec3 uTint;
  uniform float uTintStrength;
  uniform float uFlipH;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    // Back face naturally mirrors UV.x so the texture isn't seen in reverse.
    // uFlipH toggles that behaviour for whole-plane horizontal flip.
    bool flipX = gl_FrontFacing ? (uFlipH > 0.5) : (uFlipH < 0.5);
    vec2 uv = flipX ? vec2(1.0 - vUv.x, vUv.y) : vUv;
    vec4 texColor = gl_FrontFacing
      ? texture2D(uTextureFront, uv)
      : texture2D(uTextureBack, uv);

    // Images now have clean transparent backgrounds — trust the alpha channel.
    float alpha = texColor.a * uOpacity;
    if (alpha < 0.01) discard;

    // Apply tint for the dark (attacker) piece variant
    vec3 finalColor = mix(texColor.rgb, texColor.rgb * uTint, uTintStrength);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ─── Double-sided textured plane ───────────────────────────

function TexturePlane({
  frontUrl,
  backUrl,
  width,
  height,
  rotation,
  tint,
  tintStrength,
  flipH = false,
}: {
  frontUrl: string;
  backUrl: string;
  width: number;
  height: number;
  rotation: [number, number, number];
  tint: [number, number, number];
  tintStrength: number;
  flipH?: boolean;
}) {
  const frontTex = useLoader(THREE.TextureLoader, frontUrl);
  const backTex = useLoader(THREE.TextureLoader, backUrl);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTextureFront: { value: frontTex },
        uTextureBack: { value: backTex },
        uTint: { value: new THREE.Vector3(...tint) },
        uTintStrength: { value: tintStrength },
        uFlipH: { value: flipH ? 1.0 : 0.0 },
        uOpacity: { value: 1.0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
  }, [frontTex, backTex, tint, tintStrength, flipH]);

  return (
    <mesh rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ─── Reusable body (cross-planes only) ─────────────────────
// Exported so the capture animation can reuse the textured look.
// Base sits at y=0 of this component; the top of the piece extends
// upward from there. No shadow disc, no selection/hover glow.

interface TexturedPieceBodyProps {
  pieceType: PieceType;
  isDefender: boolean;
  isKing: boolean;
  version?: string;
}

export function TexturedPieceBody({
  pieceType,
  isDefender,
  isKing,
  version,
}: TexturedPieceBodyProps) {
  const scale = (isKing ? 1.2 : 1.0) * 1.2;
  const planeWidth = 1.1 * scale;
  const planeHeight = 1.25 * scale;

  const tint: [number, number, number] = isDefender
    ? [1.0, 1.0, 1.0]
    : [0.55, 0.40, 0.28];
  const tintStrength = isDefender ? 0.0 : 0.7;

  const urls = useMemo(() => ({
    front: getTextureUrl(pieceType, 'front', version),
    back: getTextureUrl(pieceType, 'back', version),
    left: getTextureUrl(pieceType, 'left', version),
    right: getTextureUrl(pieceType, 'right', version),
  }), [pieceType, version]);

  return (
    <group position={[0, planeHeight / 2, 0]}>
      <TexturePlane
        frontUrl={urls.front}
        backUrl={urls.back}
        width={planeWidth}
        height={planeHeight}
        rotation={[0, 0, 0]}
        tint={tint}
        tintStrength={tintStrength}
      />
      <TexturePlane
        frontUrl={urls.right}
        backUrl={urls.left}
        width={planeWidth}
        height={planeHeight}
        rotation={[0, Math.PI / 2, 0]}
        tint={tint}
        tintStrength={tintStrength}
        flipH
      />
    </group>
  );
}

// ─── Cross-plane piece (4 views) ────────────────────────────

interface TexturedPieceProps {
  piece: Piece;
  isSelected: boolean;
  onClick: () => void;
  isPlayerPiece: boolean;
  pieceType: PieceType;
  /** Cache-busting token — changes when textures are re-uploaded */
  version?: string;
}

// Resting Y — lower than lathe pieces so the textured base
// sits flush on the board surface (board top ≈ y 0.1).
const REST_Y = 0.12;
const SELECTED_Y = 0.4;

export default function TexturedPiece({
  piece,
  isSelected,
  onClick,
  isPlayerPiece,
  pieceType,
  version,
}: TexturedPieceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const initialPos = useRef<[number, number, number]>([
    piece.position.col - 5,
    REST_Y,
    piece.position.row - 5,
  ]);

  const targetX = piece.position.col - 5;
  const targetZ = piece.position.row - 5;

  const isKing = piece.type === 'king';
  const isDefender = piece.side === 'defenders';

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;

    const moveSpeed = Math.min(delta * 8, 1);
    pos.x += (targetX - pos.x) * moveSpeed;
    pos.z += (targetZ - pos.z) * moveSpeed;

    const dx = targetX - pos.x;
    const dz = targetZ - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const liftY = dist > 0.05 ? Math.min(dist * 0.12, 0.2) : 0;

    const targetY = (isSelected ? SELECTED_Y : REST_Y) + liftY;
    pos.y += (targetY - pos.y) * delta * 8;

    if (isSelected) {
      groupRef.current.rotation.y += delta * 1.5;
    } else {
      groupRef.current.rotation.y *= 0.95;
    }
  });

  const baseRadius = isKing ? 0.37 : 0.32;

  return (
    <group
      ref={groupRef}
      position={initialPos.current}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (isPlayerPiece) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Cross-planes — bottom aligned at y=0 so base sits on board */}
      <TexturedPieceBody
        pieceType={pieceType}
        isDefender={isDefender}
        isKing={isKing}
        version={version}
      />

      {/* Ground shadow disc */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[baseRadius, 24]} />
        <meshStandardMaterial
          color={isDefender ? '#d4c8b0' : '#6b5030'}
          roughness={0.8}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Hover glow */}
      {hovered && isPlayerPiece && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseRadius - 0.02, baseRadius + 0.06, 32]} />
          <meshStandardMaterial
            color="#d4a843"
            transparent
            opacity={0.4}
            emissive="#d4a843"
            emissiveIntensity={0.3}
          />
        </mesh>
      )}

      {/* Selection glow ring */}
      {isSelected && (
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseRadius + 0.06, baseRadius + 0.16, 32]} />
          <meshStandardMaterial
            color="#7d9c4a"
            transparent
            opacity={0.8}
            emissive="#7d9c4a"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}
