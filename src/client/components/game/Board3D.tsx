// ABOUT: 3D Hnefatafl board rendered with React Three Fiber.
// ABOUT: Ornate pieces only (v0.1); textured pieces are deferred to Phase 7.

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { GameState, Position, Piece } from '@/shared/game/types';
import type { UIState } from '@/client/hooks/useGame';
import { BOARD_SIZE, isThrone, isCorner, samePos } from '@/shared/game/index';
import OrnatePiece, { OrnatePieceBody } from '@/client/components/game/OrnatePiece';

interface Board3DProps {
  gameState: GameState;
  uiState: UIState;
  onSquareClick: (pos: Position) => void;
  onPieceClick: (piece: Piece) => void;
  playerSide: 'attackers' | 'defenders';
}

// ─── Materials ──────────────────────────────────────────────

const WOOD_LIGHT = '#c4a87a';
const WOOD_DARK = '#5c4a32';
const WOOD_FRAME = '#4a3c28';
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

// ─── Board Frame ────────────────────────────────────────────

function BoardFrame() {
  const frameThickness = 0.4;
  const boardExtent = 5.5;

  return (
    <group>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[12, 0.15, 12]} />
        <meshStandardMaterial color={WOOD_FRAME} roughness={0.6} metalness={0.05} />
      </mesh>

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

      {([
        [-boardExtent - 0.2, -boardExtent - 0.2],
        [-boardExtent - 0.2, boardExtent + 0.2],
        [boardExtent + 0.2, -boardExtent - 0.2],
        [boardExtent + 0.2, boardExtent + 0.2],
      ] as [number, number][]).map(([x, z], i) => (
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
      const t = i / (numDots - 1);

      const revealProgress = 1 - Math.exp(-elapsed * 8);
      const isRevealed = t <= revealProgress;

      const fadeStart = 0.35;
      const fadeDuration = 1.2;
      const fadeElapsed = Math.max(0, elapsed - fadeStart);
      const dotFadeDelay = t * 0.3;
      const dotFade = Math.max(0, 1 - (fadeElapsed - dotFadeDelay) / fadeDuration);

      const baseOpacity = 0.5 * (0.3 + 0.7 * (1 - t));
      mat.opacity = isRevealed ? baseOpacity * dotFade : 0;
      mesh.visible = mat.opacity > 0.01;
    }

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
}

function CapturedPieceEffect({ piece, startTime, onDone }: CapturedPieceEffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const done = useRef(false);

  const x = piece.position.col - 5;
  const z = piece.position.row - 5;

  const isDefender = piece.side === 'defenders';
  const isKing = piece.type === 'king';

  const toppleDir = useRef(Math.random() > 0.5 ? 1 : -1);
  const toppleAxis = useRef(Math.random() > 0.5 ? 'x' : 'z');

  useFrame(() => {
    if (!groupRef.current || done.current) return;
    const elapsed = (Date.now() - startTime) / 1000;

    if (elapsed > 1.2) {
      done.current = true;
      onDone();
      return;
    }

    const popUp = elapsed < 0.15 ? elapsed / 0.15 * 0.15 : 0.15;
    const sinkProgress = Math.max(0, (elapsed - 0.4) / 0.6);
    const sinkY = sinkProgress * sinkProgress * 0.5;
    groupRef.current.position.y = popUp - sinkY;

    const toppleProgress = Math.min(1, Math.max(0, (elapsed - 0.08) / 0.45));
    const eased = 1 - Math.pow(1 - toppleProgress, 3);
    const toppleAngle = eased * (Math.PI / 2) * toppleDir.current;

    if (toppleAxis.current === 'x') {
      groupRef.current.rotation.x = toppleAngle;
    } else {
      groupRef.current.rotation.z = toppleAngle;
    }

    const fadeProgress = Math.max(0, (elapsed - 0.5) / 0.5);
    const opacity = 1 - fadeProgress;
    groupRef.current.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if ('opacity' in mat) mat.opacity = opacity;
    });

    if (flashRef.current) {
      const flashProgress = Math.min(1, elapsed / 0.4);
      const flashScale = 0.5 + flashProgress * 1.5;
      flashRef.current.scale.set(flashScale, flashScale, 1);
      const flashMat = flashRef.current.material as THREE.MeshStandardMaterial;
      flashMat.opacity = Math.max(0, 0.6 * (1 - flashProgress));
    }
  });

  return (
    <group position={[x, 0.35, z]}>
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

      <group ref={groupRef}>
        <OrnatePieceBody isKing={isKing} isDefender={isDefender} transparent />
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

function Scene({ gameState, uiState, onSquareClick, onPieceClick, playerSide }: Board3DProps) {
  const validMoveSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of uiState.validMoves) {
      set.add(`${m.row},${m.col}`);
    }
    return set;
  }, [uiState.validMoves]);

  const lastMove = gameState.moveHistory.length > 0
    ? gameState.moveHistory[gameState.moveHistory.length - 1]
    : null;

  const [activeTrail, setActiveTrail] = useState<{ from: Position; to: Position; time: number } | null>(null);
  const prevMoveCount = useRef(0);

  useEffect(() => {
    if (gameState.moveHistory.length > prevMoveCount.current) {
      const move = gameState.moveHistory.at(-1);
      if (move) setActiveTrail({ from: move.from, to: move.to, time: Date.now() });
    }
    prevMoveCount.current = gameState.moveHistory.length;
  }, [gameState.moveHistory.length]);

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

      {Array.from({ length: BOARD_SIZE }).map((_, row) =>
        Array.from({ length: BOARD_SIZE }).map((_, col) => {
          const isValid = validMoveSet.has(`${row},${col}`);
          const isSelected = uiState.selectedPiece
            ? samePos(uiState.selectedPiece.position, { row, col })
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

      {gameState.pieces.map(piece => {
        const isSelected = uiState.selectedPiece?.id === piece.id;
        const isPlayerPiece = piece.side === playerSide && gameState.currentTurn === playerSide && !gameState.gameOver;
        return (
          <OrnatePiece
            key={piece.id}
            piece={piece}
            isSelected={isSelected}
            isPlayerPiece={isPlayerPiece}
            onClick={() => onPieceClick(piece)}
          />
        );
      })}

      {dyingPieces.map(dp => (
        <CapturedPieceEffect
          key={dp.id}
          piece={dp.piece}
          startTime={dp.time}
          onDone={() => setDyingPieces(prev => prev.filter(d => d.id !== dp.id))}
        />
      ))}

      {activeTrail && <MoveTrail from={activeTrail.from} to={activeTrail.to} moveTime={activeTrail.time} />}

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
