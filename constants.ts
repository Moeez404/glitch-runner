import { GlobalPhysics } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const DEFAULT_PHYSICS: GlobalPhysics = {
  gravity: 0.5,
  friction: 0.85,
  timeScale: 1.0,
};

export const COLORS = {
  background: '#0a0a0a',
  player: '#00f0ff', // Cyan
  wall: '#334155',   // Slate
  doorLocked: '#ef4444', // Red
  doorUnlocked: '#22c55e', // Green
  enemy: '#ff003c', // Cyber Red
  turret: '#d946ef', // Magenta
  projectile: '#facc15', // Yellow
  platform: '#f59e0b', // Amber
  text: '#e2e8f0', // Light slate
  highlight: '#facc15', // Yellow
  deadly: '#ef4444', // Red Glow
};

export const PLAYER_SIZE = { x: 32, y: 32 };