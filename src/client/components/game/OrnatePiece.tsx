// ABOUT: 3D ornate lathe-profile chess piece for the Hnefatafl board.
// ABOUT: OrnatePieceBody is exported separately for capture-animation reuse.

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Piece } from '@/shared/game/types';

const IVORY = '#f0e6d0';
const IVORY_HIGHLIGHT = '#f8f0e0';
const DARK_WOOD = '#8b6842';
const DARK_WOOD_HIGHLIGHT = '#9d7a52';
const GOLD = '#d4a843';
const GOLD_BAND = '#c4983a';

// ─── Lathe profile helpers ─────────────────────────────────

function createWarriorProfile(isKing: boolean): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const scale = isKing ? 1.15 : 1;
  const r = (v: number) => v * scale;

  pts.push(new THREE.Vector2(0, 0));
  pts.push(new THREE.Vector2(r(0.32), 0));
  pts.push(new THREE.Vector2(r(0.34), 0.02));
  pts.push(new THREE.Vector2(r(0.33), 0.05));
  pts.push(new THREE.Vector2(r(0.30), 0.08));
  pts.push(new THREE.Vector2(r(0.26), 0.10));
  pts.push(new THREE.Vector2(r(0.28), 0.12));
  pts.push(new THREE.Vector2(r(0.27), 0.16));
  pts.push(new THREE.Vector2(r(0.25), 0.22));
  pts.push(new THREE.Vector2(r(0.23), 0.28));
  pts.push(new THREE.Vector2(r(0.20), 0.30));
  pts.push(new THREE.Vector2(r(0.22), 0.32));
  pts.push(new THREE.Vector2(r(0.21), 0.36));
  pts.push(new THREE.Vector2(r(0.19), 0.42));
  pts.push(new THREE.Vector2(r(0.15), 0.46));
  pts.push(new THREE.Vector2(r(0.18), 0.50));
  pts.push(new THREE.Vector2(r(0.20), 0.54));
  pts.push(new THREE.Vector2(r(0.19), 0.58));
  pts.push(new THREE.Vector2(r(0.15), 0.62));
  pts.push(new THREE.Vector2(r(0.08), 0.65));
  pts.push(new THREE.Vector2(0, 0.66));

  return pts;
}

// ─── Reusable body (lathe + decorations) ──────────────────

interface OrnatePieceBodyProps {
  isKing: boolean;
  isDefender: boolean;
  hovered?: boolean;
  transparent?: boolean;
}

export function OrnatePieceBody({
  isKing,
  isDefender,
  hovered = false,
  transparent = false,
}: OrnatePieceBodyProps) {
  const profile = useMemo(() => createWarriorProfile(isKing), [isKing]);

  const latheGeom = useMemo(() => {
    const geom = new THREE.LatheGeometry(profile, 32);
    geom.computeVertexNormals();
    return geom;
  }, [profile]);

  const pieceColor = isDefender ? IVORY : DARK_WOOD;
  const highlightColor = isDefender ? IVORY_HIGHLIGHT : DARK_WOOD_HIGHLIGHT;
  const bandColor = isDefender ? '#c4a87a' : GOLD_BAND;

  return (
    <>
      <mesh geometry={latheGeom}>
        <meshStandardMaterial
          color={hovered ? highlightColor : pieceColor}
          roughness={isDefender ? 0.35 : 0.45}
          metalness={isDefender ? 0.12 : 0.08}
          transparent={transparent}
        />
      </mesh>

      <mesh position={[0, 0.11, 0]}>
        <torusGeometry args={[isKing ? 0.31 : 0.27, 0.012, 8, 32]} />
        <meshStandardMaterial
          color={bandColor}
          roughness={0.3}
          metalness={0.4}
          transparent={transparent}
        />
      </mesh>

      <mesh position={[0, 0.31, 0]}>
        <torusGeometry args={[isKing ? 0.24 : 0.21, 0.01, 8, 32]} />
        <meshStandardMaterial
          color={bandColor}
          roughness={0.3}
          metalness={0.4}
          transparent={transparent}
        />
      </mesh>

      {isKing && (
        <>
          <mesh position={[0, 0.66 * 1.15, 0]}>
            <torusGeometry args={[0.10, 0.02, 8, 32]} />
            <meshStandardMaterial color={GOLD} roughness={0.2} metalness={0.7} transparent={transparent} />
          </mesh>
          {Array.from({ length: 5 }).map((_, i) => {
            const angle = (i / 5) * Math.PI * 2;
            const cx = Math.cos(angle) * 0.08;
            const cz = Math.sin(angle) * 0.08;
            return (
              <mesh key={i} position={[cx, 0.66 * 1.15 + 0.06, cz]}>
                <coneGeometry args={[0.025, 0.08, 4]} />
                <meshStandardMaterial color={GOLD} roughness={0.2} metalness={0.7} transparent={transparent} />
              </mesh>
            );
          })}
          <mesh position={[0, 0.66 * 1.15 + 0.04, 0]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#c44040" roughness={0.3} metalness={0.3} transparent={transparent} />
          </mesh>
        </>
      )}

      {isDefender && !isKing && (
        <group position={[0, 0.38, (isKing ? 0.22 : 0.19) + 0.01]}>
          <mesh>
            <circleGeometry args={[0.07, 16]} />
            <meshStandardMaterial
              color="#c4a87a"
              roughness={0.3}
              metalness={0.3}
              transparent={transparent}
            />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <circleGeometry args={[0.03, 12]} />
            <meshStandardMaterial
              color={GOLD}
              roughness={0.2}
              metalness={0.5}
              transparent={transparent}
            />
          </mesh>
        </group>
      )}

      {!isDefender && (
        <group position={[0, 0.38, (isKing ? 0.22 : 0.19) + 0.01]}>
          <mesh>
            <boxGeometry args={[0.015, 0.12, 0.005]} />
            <meshStandardMaterial color={GOLD_BAND} roughness={0.3} metalness={0.4} transparent={transparent} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.09, 0.015, 0.005]} />
            <meshStandardMaterial color={GOLD_BAND} roughness={0.3} metalness={0.4} transparent={transparent} />
          </mesh>
        </group>
      )}
    </>
  );
}

// ─── Ornate Piece ──────────────────────────────────────────

interface OrnatePieceProps {
  piece: Piece;
  isSelected: boolean;
  onClick: () => void;
  isPlayerPiece: boolean;
}

export default function OrnatePiece({
  piece,
  isSelected,
  onClick,
  isPlayerPiece,
}: OrnatePieceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const initialPos = useRef<[number, number, number]>([
    piece.position.col - 5,
    0.35,
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

    const targetY = (isSelected ? 0.6 : 0.35) + liftY;
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
      <OrnatePieceBody
        isKing={isKing}
        isDefender={isDefender}
        hovered={hovered}
      />

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
