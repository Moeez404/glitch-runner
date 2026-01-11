export interface Vector2 {
  x: number;
  y: number;
}

export enum EntityType {
  PLAYER = 'PLAYER',
  WALL = 'WALL',
  DOOR = 'DOOR',
  PLATFORM = 'PLATFORM',
  ENEMY = 'ENEMY',
  PROJECTILE = 'PROJECTILE',
  EXIT = 'EXIT',
  TEXT = 'TEXT'
}

export interface GameEntity {
  id: string;
  type: EntityType;
  name: string;
  pos: Vector2;
  size: Vector2;
  velocity: Vector2;
  color: string;
  // Hackable properties
  isStatic: boolean;
  isSolid: boolean;
  isVisible: boolean;
  isLocked?: boolean; // For doors
  isDeadly?: boolean; // Kills player on touch
  isAlwaysVisible?: boolean; // Cannot be hidden
  gravityScale?: number; // Multiplier for gravity (can be negative)
  
  // AI / Behavior properties
  behavior?: 'DEFAULT' | 'PATROL' | 'TURRET';
  origin?: Vector2; // Original position for patrols (Legacy, prefer patrolStart)
  patrolStart?: Vector2;
  patrolEnd?: Vector2;
  patrolRange?: number; // Legacy
  patrolSpeed?: number;
  fireRate?: number; // ms between shots
  projectileSpeed?: number;
  lastFireTime?: number; // Runtime timestamp
  
  label?: string; // For text entities
  description?: string; // Hint text
}

export interface GlobalPhysics {
  gravity: number;
  friction: number;
  timeScale: number;
}

export interface LevelData {
  id: number;
  name: string;
  description: string;
  startPos: Vector2;
  entities: GameEntity[];
  physics: GlobalPhysics;
}