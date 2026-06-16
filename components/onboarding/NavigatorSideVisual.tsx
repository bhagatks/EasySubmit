"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ONBOARDING_STEP } from "@/stores/onboardingStore";

const TEAL = "#12B3D1";
const VIEW = 280;
const CENTER = VIEW / 2;

export type NavigatorSideVisualState = "idle" | "location" | "mapping";

export interface NavigatorSideVisualProps {
  state: NavigatorSideVisualState;
}

export function resolveNavigatorSideVisualState(
  currentStep: number,
  isMapping: boolean
): NavigatorSideVisualState {
  if (isMapping || currentStep === ONBOARDING_STEP.PARSING) {
    return "mapping";
  }
  if (currentStep === ONBOARDING_STEP.LOCATIONS) {
    return "location";
  }
  return "idle";
}

const transition = {
  duration: 0.55,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

const OPPORTUNITY_NODES = [
  { x: 72, y: 88, delay: 0 },
  { x: 128, y: 52, delay: 0.15 },
  { x: 196, y: 78, delay: 0.3 },
  { x: 220, y: 148, delay: 0.45 },
  { x: 168, y: 196, delay: 0.6 },
  { x: 96, y: 184, delay: 0.75 },
  { x: 52, y: 144, delay: 0.9 },
  { x: 140, y: 128, delay: 0.35 },
];

const OPPORTUNITY_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 0],
  [0, 7],
  [1, 7],
  [2, 7],
  [4, 7],
];

function GlowDefs() {
  return (
    <defs>
      <filter id="tealGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={TEAL} stopOpacity={0.9} />
        <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
      </radialGradient>
    </defs>
  );
}

function IdleConstellation() {
  return (
    <motion.svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="h-[min(360px,72vw)] w-[min(360px,72vw)] max-w-md"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
    >
      <GlowDefs />

      {OPPORTUNITY_EDGES.map(([from, to], i) => {
        const a = OPPORTUNITY_NODES[from];
        const b = OPPORTUNITY_NODES[to];
        return (
          <motion.line
            key={`edge-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={TEAL}
            strokeWidth={0.75}
            strokeOpacity={0.22}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: i * 0.04 }}
          />
        );
      })}

      {OPPORTUNITY_NODES.map((node, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -4, 0, 3, 0],
          }}
          transition={{
            opacity: { duration: 0.4, delay: node.delay },
            scale: { type: "spring", stiffness: 260, damping: 20, delay: node.delay },
            y: { duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: node.delay },
          }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        >
          <circle
            cx={node.x}
            cy={node.y}
            r={8}
            fill="url(#dotGlow)"
            opacity={0.35}
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={3}
            fill={TEAL}
            filter="url(#tealGlow)"
          />
          <motion.circle
            cx={node.x}
            cy={node.y}
            r={6}
            fill="none"
            stroke={TEAL}
            strokeWidth={0.75}
            strokeOpacity={0.4}
            animate={{ r: [6, 11, 6], opacity: [0.5, 0, 0.5] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              delay: node.delay,
              ease: "easeOut",
            }}
          />
        </motion.g>
      ))}

      <text
        x={CENTER}
        y={VIEW - 16}
        textAnchor="middle"
        className="fill-[#12B3D1] text-[9px] font-medium uppercase tracking-[0.22em]"
        opacity={0.65}
      >
        Opportunity Constellation
      </text>
    </motion.svg>
  );
}

function LocationRadar() {
  const gridStep = 28;
  const gridLines: number[] = [];
  for (let i = gridStep; i < VIEW; i += gridStep) gridLines.push(i);

  const blips = [
    { angle: 35, r: 58, delay: 0.2 },
    { angle: 128, r: 72, delay: 0.55 },
    { angle: 215, r: 48, delay: 0.9 },
    { angle: 302, r: 64, delay: 1.25 },
  ];

  const toXY = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: CENTER + radius * Math.cos(rad),
      y: CENTER + radius * Math.sin(rad),
    };
  };

  return (
    <motion.svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="h-[min(360px,72vw)] w-[min(360px,72vw)] max-w-md"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
    >
      <GlowDefs />

      {gridLines.map((pos) => (
        <g key={`grid-${pos}`}>
          <line
            x1={pos}
            y1={0}
            x2={pos}
            y2={VIEW}
            stroke={TEAL}
            strokeWidth={0.5}
            strokeOpacity={0.1}
          />
          <line
            x1={0}
            y1={pos}
            x2={VIEW}
            y2={pos}
            stroke={TEAL}
            strokeWidth={0.5}
            strokeOpacity={0.1}
          />
        </g>
      ))}

      {[32, 56, 80, 104].map((radius, i) => (
        <motion.circle
          key={radius}
          cx={CENTER}
          cy={CENTER}
          r={radius}
          fill="none"
          stroke={TEAL}
          strokeWidth={0.75}
          strokeOpacity={0.14 - i * 0.02}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
        />
      ))}

      {[0, 1, 2].map((i) => (
        <motion.circle
          key={`pulse-${i}`}
          cx={CENTER}
          cy={CENTER}
          r={24}
          fill="none"
          stroke={TEAL}
          strokeWidth={0.75}
          strokeOpacity={0.45}
          animate={{ r: [24, 112], opacity: [0.55, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.85,
            ease: "easeOut",
          }}
        />
      ))}

      <motion.g
        style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      >
        <line
          x1={CENTER}
          y1={CENTER}
          x2={CENTER}
          y2={CENTER - 108}
          stroke={TEAL}
          strokeWidth={0.75}
          strokeOpacity={0.5}
        />
        <path
          d={`M ${CENTER} ${CENTER} L ${CENTER - 14} ${CENTER - 108} A 14 14 0 0 1 ${CENTER + 14} ${CENTER - 108} Z`}
          fill={TEAL}
          fillOpacity={0.06}
        />
      </motion.g>

      {blips.map((blip, i) => {
        const { x, y } = toXY(blip.angle, blip.r);
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: blip.delay, type: "spring", stiffness: 280, damping: 22 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          >
            <circle cx={x} cy={y} r={7} fill="url(#dotGlow)" opacity={0.4} />
            <circle cx={x} cy={y} r={2.5} fill={TEAL} filter="url(#tealGlow)" />
          </motion.g>
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={3.5} fill={TEAL} filter="url(#tealGlow)" />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={7}
        fill="none"
        stroke={TEAL}
        strokeWidth={0.75}
        strokeOpacity={0.35}
      />

      <text
        x={CENTER}
        y={VIEW - 16}
        textAnchor="middle"
        className="fill-[#12B3D1] text-[9px] font-medium uppercase tracking-[0.22em]"
        opacity={0.65}
      >
        Location Radar
      </text>
    </motion.svg>
  );
}

function MappingScan() {
  const docX = 58;
  const docY = 52;
  const docW = 88;
  const docH = 148;
  const hubX = 208;
  const hubY = CENTER;

  const skeletonLines = [
    { y: 78, w: 48 },
    { y: 96, w: 64 },
    { y: 114, w: 40 },
    { y: 132, w: 56 },
    { y: 150, w: 36 },
    { y: 168, w: 52 },
  ];

  const dataBits = [
    { sx: docX + 22, sy: docY + 40, delay: 0 },
    { sx: docX + 58, sy: docY + 72, delay: 0.4 },
    { sx: docX + 30, sy: docY + 108, delay: 0.8 },
    { sx: docX + 64, sy: docY + 56, delay: 1.2 },
    { sx: docX + 38, sy: docY + 130, delay: 1.6 },
  ];

  return (
    <motion.svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="h-[min(360px,72vw)] w-[min(360px,72vw)] max-w-md"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
    >
      <GlowDefs />

      <motion.rect
        x={docX}
        y={docY}
        width={docW}
        height={docH}
        rx={10}
        fill="white"
        fillOpacity={0.55}
        stroke={TEAL}
        strokeWidth={1}
        strokeOpacity={0.35}
        initial={{ opacity: 0, y: docY + 10 }}
        animate={{ opacity: 1, y: docY }}
        transition={{ duration: 0.45 }}
      />

      {skeletonLines.map((line, i) => (
        <motion.line
          key={line.y}
          x1={docX + 12}
          y1={line.y}
          x2={docX + 12 + line.w}
          y2={line.y}
          stroke={TEAL}
          strokeWidth={0.75}
          strokeOpacity={0.18}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 + i * 0.05 }}
        />
      ))}

      {[0, 1, 2].map((i) => (
        <motion.line
          key={`scan-${i}`}
          x1={docX + 8}
          x2={docX + docW - 8}
          stroke={TEAL}
          strokeWidth={1.5}
          strokeOpacity={0.75}
          strokeLinecap="round"
          filter="url(#tealGlow)"
          animate={{
            y1: [docY + 10, docY + docH - 10, docY + 10],
            y2: [docY + 10, docY + docH - 10, docY + 10],
            opacity: [0.15, 0.95, 0.15],
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "linear",
          }}
        />
      ))}

      <motion.circle
        cx={hubX}
        cy={hubY}
        r={26}
        fill="none"
        stroke={TEAL}
        strokeWidth={0.75}
        strokeOpacity={0.25}
        animate={{ r: [26, 32, 26], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
      <motion.circle
        cx={hubX}
        cy={hubY}
        r={18}
        fill={TEAL}
        fillOpacity={0.07}
        stroke={TEAL}
        strokeWidth={0.75}
        strokeOpacity={0.4}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ transformOrigin: `${hubX}px ${hubY}px` }}
      />
      <circle cx={hubX} cy={hubY} r={4} fill={TEAL} filter="url(#tealGlow)" />

      {dataBits.map((bit, i) => (
        <motion.g key={i}>
          <motion.circle
            r={2.5}
            fill={TEAL}
            filter="url(#tealGlow)"
            animate={{
              cx: [bit.sx, hubX],
              cy: [bit.sy, hubY],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 1.9,
              repeat: Infinity,
              delay: bit.delay,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
          <motion.line
            stroke={TEAL}
            strokeWidth={0.75}
            strokeOpacity={0.2}
            animate={{
              x1: [bit.sx, hubX],
              y1: [bit.sy, hubY],
              x2: [bit.sx, hubX],
              y2: [bit.sy, hubY],
              opacity: [0, 0.45, 0],
            }}
            transition={{
              duration: 1.9,
              repeat: Infinity,
              delay: bit.delay,
            }}
          />
        </motion.g>
      ))}

      <text
        x={CENTER}
        y={VIEW - 16}
        textAnchor="middle"
        className="fill-[#12B3D1] text-[9px] font-medium uppercase tracking-[0.22em]"
        opacity={0.65}
      >
        Profile Mapping
      </text>
    </motion.svg>
  );
}

export default function NavigatorSideVisual({ state }: NavigatorSideVisualProps) {
  return (
    <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center px-8 py-16 lg:min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          layout
          initial={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
          transition={transition}
          className="flex items-center justify-center"
        >
          {state === "idle" && <IdleConstellation />}
          {state === "location" && <LocationRadar />}
          {state === "mapping" && <MappingScan />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
