import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { GameState, Position, Piece } from '@/types/game';
import type { PieceStyle } from '@/hooks/usePieceStyle';
import { BOARD_SIZE, isThrone, isCorner, samePos } from '@/lib/game';
import OrnatePiece, { OrnatePieceBody } from '@/components/game/OrnatePiece';
import TexturedPiece, { TexturedPieceBody } from '@/components/game/TexturedPiece';
import { useTextureAvailability } from '@/hooks/useTextureAvailability';

interface Board3DProps {
  gameState: GameState;
  onSquareClick: (pos: Position) => void;
  onPieceClick: (piece: Piece) => void;
  playerSide: 'attackers' | 'defenders';
  pieceStyle: PieceStyle;
}

// ─── Materials ──────────────────────────────────────────────

const WOOD_LIGHT = '#c4a87a';
const WOOD_DARK = '#5c4a32';
const WOOD_FRAME = '#4a3c28';
const IVORY = '#f0e6d0';
const IVORY_HIGHLIGHT = '#f5edd8';
const DARK_WOOD_PIECE = '#8b6842';
const GOLD = '#d4a843';
const THRONE_COLOR = '#6d5a3e';

// ─── Board Square ───────────────────────────────────────────

function BoardSquare({
  row,
  col,
  isValid,
  isSelected,
  onClick,
}: {
  row: number;
  col: number;
  isValid: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const pos = useMemo(() => ({ row, col }), [row, col]);
  const throne = isThrone(pos);
  const corner = isCorner(pos);

  const color = useMemo(() => {
    if (isSelected) return '#7d9c4a';
    if (isValid && hovered) return '#8aad55';
    if (isValid) return 'rgba(122, 156, 74, 0.8)';
    if (throne) return THRONE_COLOR;
    if (corner) return THRONE_COLOR;
    return WOOD_LIGHT;
  }, [throne, corner, isValid, isSelected, hovered]);

  const x = col - 5;
  const z = row - 5;

  return (
    <mesh
      ref={ref}
      position={[x, 0.05, z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = isValid ? 'pointer' : 'default';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      <boxGeometry args={[0.92, 0.1, 0.92]} />
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.05}
      />
      {/* Throne/corner markers */}
      {(throne || corner) && (
        <mesh position={[0, 0.06, 0]}>
          <ringGeometry args={[0.15, 0.25, corner ? 4 : 32]} />
          <meshStandardMaterial
            color={GOLD}
            roughness={0.3}
            metalness={0.6}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
      {/* Valid move indicator */}
      {isValid && !isSelected && (
        <mesh position={[0, 0.07, 0]}>
          <circleGeometry args={[0.12, 16]} />
          <meshStandardMaterial
            color="#7d9c4a"
            roughness={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </mesh>
  );
}

// ─── Game Piece ─────────────────────────────────────────────

function GamePiece({
  piece,
  isSelected,
  onClick,
  isPlayerPiece,
}: {
  piece: Piece;
  isSelected: boolean;
  onClick: () => void;
  isPlayerPiece: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Memoize initial position so R3F doesn't overwrite useFrame updates
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

    // Smooth slide animation
    const moveSpeed = Math.min(delta * 8, 1);
    pos.x += (targetX - pos.x) * moveSpeed;
    pos.z += (targetZ - pos.z) * moveSpeed;

    // Subtle lift during movement
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

  const pieceColor = isDefender ? IVORY : DARK_WOOD_PIECE;
  const highlightColor = isDefender ? IVORY_HIGHLIGHT : '#9d7a52';

  const baseRadius = isKing ? 0.35 : 0.28;
  const height = isKing ? 0.55 : 0.4;

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
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[baseRadius, baseRadius + 0.05, 0.08, 24]} />
        <meshStandardMaterial color={pieceColor} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Body */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[baseRadius - 0.04, baseRadius, height, 24]} />
        <meshStandardMaterial
          color={hovered ? highlightColor : pieceColor}
          roughness={0.4}
          metalness={0.15}
        />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, height + 0.02, 0]}>
        <cylinderGeometry args={[baseRadius - 0.06, baseRadius - 0.04, 0.06, 24]} />
        <meshStandardMaterial color={pieceColor} roughness={0.4} metalness={0.15} />
      </mesh>

      {/* King crown */}
      {isKing && (
        <>
          <mesh position={[0, height + 0.12, 0]}>
            <cylinderGeometry args={[0.08, 0.15, 0.12, 6]} />
            <meshStandardMaterial color={GOLD} roughness={0.2} metalness={0.7} />
          </mesh>
          <mesh position={[0, height + 0.2, 0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={GOLD} roughness={0.2} metalness={0.7} />
          </mesh>
        </>
      )}

      {/* Selection glow ring */}
      {isSelected && (
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseRadius + 0.08, baseRadius + 0.18, 32]} />
          <meshStandardMaterial
            color="#7d9c4a"
            transparent
            opacity={0.8}
            emissive="#7d9c4a"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {/* Shield emblem (ring on body) */}
      <mesh position={[0, height * 0.45, baseRadius - 0.02]} rotation={[0, 0, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial
          color={isDefender ? '#b8a080' : '#a07850'}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

// ─── Board Frame ────────────────────────────────────────────

function BoardFrame() {
  const frameThickness = 0.4;
  const boardExtent = 5.5;

  return (
    <group>
      {/* Base platform */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[12, 0.15, 12]} />
        <meshStandardMaterial color={WOOD_FRAME} roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Frame borders */}
      {[
        { pos: [0, 0.05, -boardExtent - frameThickness / 2] as [number, number, number], size: [11.8, 0.2, frameThickness] as [number, number, number] },
        { pos: [0, 0.05, boardExtent + frameThickness / 2] as [number, number, number], size: [11.8, 0.2, frameThickness] as [number, number, number] },
        { pos: [-boardExtent - frameThickness / 2, 0.05, 0] as [number, number, number], size: [frameThickness, 0.2, 12.6] as [number, number, number] },
        { pos: [boardExtent + frameThickness / 2, 0.05, 0] as [number, number, number], size: [frameThickness, 0.2, 12.6] as [number, number, number] },
      ].map((frame, i) => (
        <mesh key={i} position={frame.pos}>
          <boxGeometry args={frame.size} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.5} metalness={0.1} />
        </mesh>
      ))}

      {/* Corner ornaments */}
      {[
        [-boardExtent - 0.2, -boardExtent - 0.2],
        [-boardExtent - 0.2, boardExtent + 0.2],
        [boardExtent + 0.2, -boardExtent - 0.2],
        [boardExtent + 0.2, boardExtent + 0.2],
      ].map(([x, z], i) => (
        <mesh key={`corner-${i}`} position={[x, 0.16, z]}>
          <cylinderGeometry args={[0.15, 0.15, 0.12, 8]} />
          <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Lighting ───────────────────────────────────────────────

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffe8cc" />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.2}
        color="#fff5e0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#e8d0b0" />
      <pointLight position={[0, 6, 0]} intensity={0.4} color="#ffd080" distance={20} />
    </>
  );
}

// ─── Last Move Indicator ─────────────────────────────────────

function LastMoveIndicator({ from, to }: { from: Position; to: Position }) {
  return (
    <>
      <mesh position={[from.col - 5, 0.12, from.row - 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.38, 32]} />
        <meshStandardMaterial color="#b8922e" transparent opacity={0.4} />
      </mesh>
      <mesh position={[to.col - 5, 0.12, to.row - 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.38, 32]} />
        <meshStandardMaterial color="#b8922e" transparent opacity={0.6} />
      </mesh>
    </>
  );
}

// ─── Move Trail ─────────────────────────────────────────────

function MoveTrail({ from, to, moveTime }: { from: Position; to: Position; moveTime: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const fx = from.col - 5;
  const fz = from.row - 5;
  const tx = to.col - 5;
  const tz = to.row - 5;
  const dx = tx - fx;
  const dz = tz - fz;
  const pathLength = Math.sqrt(dx * dx + dz * dz);

  const numDots = Math.max(3, Math.ceil(pathLength * 3));

  useFrame(() => {
    if (!groupRef.current) return;
    const elapsed = (Date.now() - moveTime) / 1000;

    for (let i = 0; i < groupRef.current.children.length; i++) {
      const mesh = groupRef.current.children[i] as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const t = i / (numDots - 1); // 0 = from, 1 = to

      // Reveal dots progressively, synced to piece slide speed (~0.35s)
      const revealProgress = 1 - Math.exp(-elapsed * 8);
      const isRevealed = t <= revealProgress;

      // After piece arrives, fade out (from-end first)
      const fadeStart = 0.35;
      const fadeDuration = 1.2;
      const fadeElapsed = Math.max(0, elapsed - fadeStart);
      const dotFadeDelay = t * 0.3; // dots near 'from' fade earlier
      const dotFade = Math.max(0, 1 - (fadeElapsed - dotFadeDelay) / fadeDuration);

      const baseOpacity = 0.5 * (0.3 + 0.7 * (1 - t)); // brighter near origin
      mat.opacity = isRevealed ? baseOpacity * dotFade : 0;
      mesh.visible = mat.opacity > 0.01;
    }

    // Hide entirely when done
    if ((Date.now() - moveTime) / 1000 > 2) {
      groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: numDots }).map((_, i) => {
        const t = i / (numDots - 1);
        return (
          <mesh
            key={i}
            position={[fx + dx * t, 0.12, fz + dz * t]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.06, 8]} />
            <meshStandardMaterial
              color="#b8922e"
              transparent
              opacity={0}
              emissive="#b8922e"
              emissiveIntensity={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Captured Piece Effect ──────────────────────────────────

interface DyingPiece {
  piece: Piece;
  time: number;
  id: string;
}

interface CapturedPieceEffectProps {
  piece: Piece;
  startTime: number;
  onDone: () => void;
  pieceStyle: PieceStyle;
  useTexture: boolean;
  textureVersion?: string;
}

function CapturedPieceEffect({
  piece,
  startTime,
  onDone,
  pieceStyle,
  useTexture,
  textureVersion,
}: CapturedPieceEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const done = useRef(false);

  const x = piece.position.col - 5;
  const z = piece.position.row - 5;

  const isDefender = piece.side === 'defenders';
  const isKing = piece.type === 'king';

  // Baseline Y differs per style — textured pieces sit lower on the board.
  const isTextured = pieceStyle === 'ornate' && useTexture;
  const baseY = isTextured ? 0.12 : 0.35;

  const baseRadius = isKing ? 0.35 : 0.28;
  const height = isKing ? 0.55 : 0.4;
  const pieceColor = isDefender ? IVORY : DARK_WOOD_PIECE;

  // Random topple direction
  const toppleDir = useRef(Math.random() > 0.5 ? 1 : -1);
  const toppleAxis = useRef(Math.random() > 0.5 ? 'x' : 'z');

  useFrame(() => {
    if (!groupRef.current || done.current) return;
    const elapsed = (Date.now() - startTime) / 1000;

    // Duration: ~1s total
    if (elapsed > 1.2) {
      done.current = true;
      onDone();
      return;
    }

    // Phase 1 (0-0.15s): small upward pop
    // Phase 2 (0.1-0.6s): topple over
    // Phase 3 (0.4-1.0s): sink + fade out

    // Pop up then sink — inner group offset from outer baseY
    const popUp = elapsed < 0.15 ? elapsed / 0.15 * 0.15 : 0.15;
    const sinkProgress = Math.max(0, (elapsed - 0.4) / 0.6);
    const sinkY = sinkProgress * sinkProgress * 0.5;
    groupRef.current.position.y = popUp - sinkY;

    // Topple rotation
    const toppleProgress = Math.min(1, Math.max(0, (elapsed - 0.08) / 0.45));
    const eased = 1 - Math.pow(1 - toppleProgress, 3); // ease-out cubic
    const toppleAngle = eased * (Math.PI / 2) * toppleDir.current;

    if (toppleAxis.current === 'x') {
      groupRef.current.rotation.x = toppleAngle;
    } else {
      groupRef.current.rotation.z = toppleAngle;
    }

    // Fade out all piece meshes — handles both MeshStandardMaterial
    // (ornate, classic) and our custom ShaderMaterial (textured).
    const fadeProgress = Math.max(0, (elapsed - 0.5) / 0.5);
    const opacity = 1 - fadeProgress;
    groupRef.current.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.Material;
      if (mat instanceof THREE.ShaderMaterial) {
        if (mat.uniforms?.uOpacity) mat.uniforms.uOpacity.value = opacity;
      } else if ('opacity' in mat) {
        (mat as THREE.MeshStandardMaterial).opacity = opacity;
      }
    });

    // Flash ring
    if (flashRef.current) {
      const flashProgress = Math.min(1, elapsed / 0.4);
      const flashScale = 0.5 + flashProgress * 1.5;
      flashRef.current.scale.set(flashScale, flashScale, 1);
      const flashMat = flashRef.current.material as THREE.MeshStandardMaterial;
      flashMat.opacity = Math.max(0, 0.6 * (1 - flashProgress));
    }
  });

  // Simple cylinder fallback (classic style or loading-texture fallback)
  const classicBody = (
    <>
      <mesh>
        <cylinderGeometry args={[baseRadius, baseRadius + 0.05, 0.08, 24]} />
        <meshStandardMaterial
          color={pieceColor}
          roughness={0.5}
          metalness={0.1}
          transparent
        />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[baseRadius - 0.04, baseRadius, height, 24]} />
        <meshStandardMaterial
          color={pieceColor}
          roughness={0.4}
          metalness={0.15}
          transparent
          opacity={1}
        />
      </mesh>
      <mesh position={[0, height + 0.02, 0]}>
        <cylinderGeometry args={[baseRadius - 0.06, baseRadius - 0.04, 0.06, 24]} />
        <meshStandardMaterial
          color={pieceColor}
          roughness={0.4}
          metalness={0.15}
          transparent
          opacity={1}
        />
      </mesh>
      {isKing && (
        <mesh position={[0, height + 0.12, 0]}>
          <cylinderGeometry args={[0.08, 0.15, 0.12, 6]} />
          <meshStandardMaterial color={GOLD} roughness={0.2} metalness={0.7} transparent opacity={1} />
        </mesh>
      )}
    </>
  );

  const ornateBody = (
    <OrnatePieceBody
      isKing={isKing}
      isDefender={isDefender}
      transparent
    />
  );

  let body: React.ReactNode;
  if (isTextured) {
    // Wrap textured body in Suspense — useLoader suspends while images
    // decode. Fall back to the ornate body so the capture animation still
    // looks right if texture loading stalls.
    body = (
      <Suspense fallback={ornateBody}>
        <TexturedPieceBody
          pieceType={piece.type === 'king' ? 'king' : 'warrior'}
          isDefender={isDefender}
          isKing={isKing}
          version={textureVersion}
        />
      </Suspense>
    );
  } else if (pieceStyle === 'ornate') {
    body = ornateBody;
  } else {
    body = classicBody;
  }

  return (
    <group position={[x, baseY, z]}>
      {/* Flash ring — stays at base, doesn't topple */}
      <mesh ref={flashRef} position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.3, 16]} />
        <meshStandardMaterial
          color={isDefender ? '#c44040' : '#d4a843'}
          transparent
          opacity={0.6}
          emissive={isDefender ? '#c44040' : '#d4a843'}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Toppling piece body */}
      <group ref={groupRef}>
        {body}
      </group>
    </group>
  );
}

// ─── Resize Handler ─────────────────────────────────────────

function ResizeHandler() {
  const { gl, camera } = useThree();

  useEffect(() => {
    const handleResize = () => {
      const canvas = gl.domElement;
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        gl.setSize(rect.width, rect.height);
        if ('aspect' in camera) {
          (camera as THREE.PerspectiveCamera).aspect = rect.width / rect.height;
          camera.updateProjectionMatrix();
        }
      }
    };

    handleResize();
    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);

    const parent = gl.domElement.parentElement;
    let observer: ResizeObserver | undefined;
    if (parent) {
      observer = new ResizeObserver(handleResize);
      observer.observe(parent);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [gl, camera]);

  return null;
}

// ─── Main Scene ──────────────────────────────────────────────

function Scene({ gameState, onSquareClick, onPieceClick, playerSide, pieceStyle }: Board3DProps) {
  const { kingReady, warriorReady, kingVersion, warriorVersion } = useTextureAvailability();

  const validMoveSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of gameState.validMoves) {
      set.add(`${m.row},${m.col}`);
    }
    return set;
  }, [gameState.validMoves]);

  const lastMove = gameState.moveHistory.length > 0
    ? gameState.moveHistory[gameState.moveHistory.length - 1]
    : null;

  // Track active trail for the most recent move
  const [activeTrail, setActiveTrail] = useState<{ from: Position; to: Position; time: number } | null>(null);
  const prevMoveCount = useRef(0);

  useEffect(() => {
    if (gameState.moveHistory.length > prevMoveCount.current) {
      const move = gameState.moveHistory[gameState.moveHistory.length - 1];
      setActiveTrail({ from: move.from, to: move.to, time: Date.now() });
    }
    prevMoveCount.current = gameState.moveHistory.length;
  }, [gameState.moveHistory.length]);

  // Track captured pieces for death animation
  const [dyingPieces, setDyingPieces] = useState<DyingPiece[]>([]);
  const prevPieceIds = useRef<Map<string, Piece>>(new Map());

  useEffect(() => {
    const currentIds = new Set(gameState.pieces.map(p => p.id));
    const newDying: DyingPiece[] = [];

    for (const [id, piece] of prevPieceIds.current) {
      if (!currentIds.has(id) && piece.type !== 'king') {
        newDying.push({ piece, time: Date.now(), id });
      }
    }

    if (newDying.length > 0) {
      setDyingPieces(prev => [...prev, ...newDying]);
    }

    const newMap = new Map<string, Piece>();
    for (const p of gameState.pieces) {
      newMap.set(p.id, p);
    }
    prevPieceIds.current = newMap;
  }, [gameState.pieces]);

  return (
    <>
      <ResizeHandler />
      <Lighting />
      <BoardFrame />

      {/* Board squares */}
      {Array.from({ length: BOARD_SIZE }).map((_, row) =>
        Array.from({ length: BOARD_SIZE }).map((_, col) => {
          const isValid = validMoveSet.has(`${row},${col}`);
          const isSelected = gameState.selectedPiece
            ? samePos(gameState.selectedPiece.position, { row, col })
            : false;

          return (
            <BoardSquare
              key={`${row}-${col}`}
              row={row}
              col={col}
              isValid={isValid}
              isSelected={isSelected}
              onClick={() => {
                if (isValid) {
                  onSquareClick({ row, col });
                }
              }}
            />
          );
        })
      )}

      {/* Pieces */}
      {gameState.pieces.map(piece => {
        const isSelected = gameState.selectedPiece?.id === piece.id;
        const isPlayerPiece = piece.side === playerSide && gameState.currentTurn === playerSide && !gameState.gameOver;
        const handleClick = () => onPieceClick(piece);

        // Use textured pieces when available + ornate style is active
        if (pieceStyle === 'ornate') {
          const useTexture = piece.type === 'king' ? kingReady : warriorReady;
          if (useTexture) {
            return (
              <Suspense key={piece.id} fallback={
                <OrnatePiece
                  piece={piece}
                  isSelected={isSelected}
                  isPlayerPiece={isPlayerPiece}
                  onClick={handleClick}
                />
              }>
                <TexturedPiece
                  piece={piece}
                  isSelected={isSelected}
                  isPlayerPiece={isPlayerPiece}
                  onClick={handleClick}
                  pieceType={piece.type === 'king' ? 'king' : 'warrior'}
                  version={piece.type === 'king' ? kingVersion : warriorVersion}
                />
              </Suspense>
            );
          }
          return (
            <OrnatePiece
              key={piece.id}
              piece={piece}
              isSelected={isSelected}
              isPlayerPiece={isPlayerPiece}
              onClick={handleClick}
            />
          );
        }

        return (
          <GamePiece
            key={piece.id}
            piece={piece}
            isSelected={isSelected}
            isPlayerPiece={isPlayerPiece}
            onClick={handleClick}
          />
        );
      })}

      {/* Captured piece animations */}
      {dyingPieces.map(dp => {
        const isKingPiece = dp.piece.type === 'king';
        const textureReady = isKingPiece ? kingReady : warriorReady;
        return (
          <CapturedPieceEffect
            key={dp.id}
            piece={dp.piece}
            startTime={dp.time}
            onDone={() => setDyingPieces(prev => prev.filter(d => d.id !== dp.id))}
            pieceStyle={pieceStyle}
            useTexture={pieceStyle === 'ornate' && textureReady}
            textureVersion={isKingPiece ? kingVersion : warriorVersion}
          />
        );
      })}

      {/* Move trail */}
      {activeTrail && <MoveTrail from={activeTrail.from} to={activeTrail.to} moveTime={activeTrail.time} />}

      {/* Last move indicator */}
      {lastMove && <LastMoveIndicator from={lastMove.from} to={lastMove.to} />}

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={20}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.5}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

// ─── Canvas wrapper ─────────────────────────────────────────

export default function Board3D(props: Board3DProps) {
  // Camera position based on player side
  const cameraPos = useMemo((): [number, number, number] => {
    if (props.playerSide === 'defenders') {
      return [0, 12, 10];
    }
    return [0, 12, -10];
  }, [props.playerSide]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{
          position: cameraPos,
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{
          background: 'transparent',
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
