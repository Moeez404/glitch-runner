import React, { useRef, useState } from 'react';
import { GameEntity, EntityType, Vector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '../constants';

interface GameViewportProps {
  entities: GameEntity[];
  playerId: string;
  onSelectEntity: (id: string | null) => void;
  selectedEntityId: string | null;
  onSceneClick?: (x: number) => void;
  // Editor Props
  isEditor?: boolean;
  onEntityMove?: (id: string, newPos: Vector2) => void;
  onDropEntity?: (e: React.DragEvent, x: number, y: number) => void;
}

export const GameViewport: React.FC<GameViewportProps> = ({ 
  entities, 
  playerId, 
  onSelectEntity,
  selectedEntityId,
  onSceneClick,
  isEditor = false,
  onEntityMove,
  onDropEntity
}) => {
  const player = entities.find(e => e.type === EntityType.PLAYER);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Vector2>({ x: 0, y: 0 });

  // Grid Snap size
  const SNAP = 10;

  const handleMouseDown = (e: React.MouseEvent, entity: GameEntity) => {
    if (!isEditor) return;
    e.stopPropagation();
    onSelectEntity(entity.id);
    setDraggingId(entity.id);
    
    // Calculate offset from top-left of entity
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isEditor || !draggingId || !onEntityMove || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const rawX = e.clientX - containerRect.left - dragOffset.x;
      const rawY = e.clientY - containerRect.top - dragOffset.y;

      // Snap to grid
      const snappedX = Math.round(rawX / SNAP) * SNAP;
      const snappedY = Math.round(rawY / SNAP) * SNAP;

      onEntityMove(draggingId, { x: snappedX, y: snappedY });
  };

  const handleMouseUp = () => {
      if (isEditor) {
          setDraggingId(null);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditor || !onDropEntity || !containerRef.current) return;
    e.preventDefault();
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - containerRect.left) / SNAP) * SNAP;
    const y = Math.round((e.clientY - containerRect.top) / SNAP) * SNAP;
    onDropEntity(e, x, y);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black overflow-hidden shadow-inner select-none ${isEditor ? 'cursor-default' : 'cursor-crosshair'}`}
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={(e) => {
        if (draggingId) return; // Don't trigger click if we just finished dragging
        // Calculate relative coordinates
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (onSceneClick && !isEditor) {
          onSceneClick(x);
        }
        if (e.target === e.currentTarget) {
             onSelectEntity(null);
        }
      }}
    >
      {/* Animation Definitions */}
      <style>{`
        @keyframes walk-leg {
          0% { transform: rotate(-30deg); }
          50% { transform: rotate(30deg); }
          100% { transform: rotate(-30deg); }
        }
        @keyframes walk-bob {
          0% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
          100% { transform: translateY(0); }
        }
        @keyframes deadly-pulse {
            0% { opacity: 0.6; box-shadow: 0 0 10px ${COLORS.deadly}; }
            50% { opacity: 1; box-shadow: 0 0 20px ${COLORS.deadly}, inset 0 0 10px ${COLORS.deadly}; }
            100% { opacity: 0.6; box-shadow: 0 0 10px ${COLORS.deadly}; }
        }
        @keyframes projectile-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes scan-sweep {
            0% { transform: rotate(-45deg); }
            50% { transform: rotate(45deg); }
            100% { transform: rotate(-45deg); }
        }
      `}</style>

      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
          backgroundSize: isEditor ? '20px 20px' : '40px 40px',
          opacity: isEditor ? 0.3 : 0.2
        }}
      />
      
      {/* Editor Center Axis Lines */}
      {isEditor && (
        <>
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-900/50 pointer-events-none" />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-900/50 pointer-events-none" />
        </>
      )}

      {/* Patrol Paths Visualization */}
      {entities.map(entity => {
          // New Patrol System
          if (entity.behavior === 'PATROL' && entity.patrolStart && entity.patrolEnd && (entity.isVisible || isEditor)) {
              const dx = entity.patrolEnd.x - entity.patrolStart.x;
              const dy = entity.patrolEnd.y - entity.patrolStart.y;
              const len = Math.sqrt(dx*dx + dy*dy);
              const angle = Math.atan2(dy, dx) * (180/Math.PI);
              
              return (
                  <div 
                    key={`path_${entity.id}`}
                    className="absolute pointer-events-none"
                    style={{
                        left: `${entity.patrolStart.x}px`,
                        top: `${entity.patrolStart.y + entity.size.y/2}px`,
                        width: `${len}px`,
                        height: '2px',
                        transformOrigin: '0 50%',
                        transform: `rotate(${angle}deg)`,
                        borderBottom: '1px dashed rgba(239, 68, 68, 0.3)',
                        zIndex: 5
                    }}
                >
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500/50 rounded-full" />
                    <div className="absolute -right-1 -top-1 w-2 h-2 bg-red-500/50 rounded-full" />
                </div>
              );
          }
          // Legacy Patrol System (Fallback)
          if (entity.behavior === 'PATROL' && entity.origin && entity.patrolRange && entity.isVisible && !entity.patrolStart) {
              return (
                <div 
                    key={`path_${entity.id}`}
                    className="absolute border-b border-red-500/30 border-dashed pointer-events-none"
                    style={{
                        left: `${entity.origin.x}px`,
                        top: `${entity.origin.y + entity.size.y - 2}px`, // At feet level
                        width: `${entity.patrolRange}px`,
                        height: '2px',
                        zIndex: 5
                    }}
                >
                    <div className="absolute -left-0.5 -top-0.5 w-1 h-1 bg-red-500/50 rounded-full" />
                    <div className="absolute -right-0.5 -top-0.5 w-1 h-1 bg-red-500/50 rounded-full" />
                </div>
              );
          }
          return null;
      })}

      {entities.map(entity => {
        const isSelected = selectedEntityId === entity.id;
        const isPlayer = entity.type === EntityType.PLAYER;
        const isEnemy = entity.type === EntityType.ENEMY || (entity.type === EntityType.WALL && entity.color === COLORS.enemy);
        const isProjectile = entity.type === EntityType.PROJECTILE;
        const isDoor = entity.type === EntityType.DOOR;
        const isDeadly = entity.isDeadly;
        
        // Base Style Container
        let style: React.CSSProperties = {
            position: 'absolute',
            left: `${entity.pos.x}px`,
            top: `${entity.pos.y}px`,
            width: `${entity.size.x}px`,
            height: `${entity.size.y}px`,
            // Background is handled by inner elements for complex types
            backgroundColor: (isPlayer || isEnemy || isProjectile) ? 'transparent' : ((entity.isVisible || isEditor) ? entity.color : 'rgba(255,255,255,0.1)'),
            opacity: (entity.isVisible || isEditor) ? 1 : (isSelected ? 0.3 : 0),
            zIndex: isPlayer ? 20 : 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: (entity.isVisible || isEditor || isSelected) ? 'auto' : 'none',
            transition: isEditor ? 'none' : 'opacity 0.2s, transform 0.2s',
            cursor: isEditor ? (draggingId === entity.id ? 'grabbing' : 'grab') : 'pointer',
        };

        // Editor visualization for invisible items
        if (isEditor && !entity.isVisible) {
            style.border = '1px dashed #555';
        }

        // Borders
        if (isSelected) {
            style.border = (isPlayer || isEnemy) ? 'none' : `2px solid ${COLORS.highlight}`;
            style.zIndex = 30; // Bring to front when selected
        } else if (!isEditor) {
             style.border = 'none'; 
        }

        // Texture for generic walls/platforms
        if (!isPlayer && !isEnemy && !isDoor && !isDeadly && !isProjectile && entity.type !== EntityType.TEXT && entity.type !== EntityType.EXIT && (entity.isVisible || isEditor)) {
             style.backgroundImage = `linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 75%, transparent 75%, transparent)`;
             style.backgroundSize = '20px 20px';
        }
        
        // Deadly Texture
        if (isDeadly && (entity.isVisible || isEditor) && !isProjectile && !isEnemy) {
            style.animation = !isEditor ? 'deadly-pulse 1s infinite' : 'none';
            style.backgroundImage = 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)';
        }

        // Door Texture
        if (isDoor && (entity.isVisible || isEditor)) {
             style.backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px)';
             if (isSelected) style.border = `2px solid ${COLORS.highlight}`;
             else style.border = `2px solid ${entity.color}`;
        }

        // Calculate dynamic animation variables for player
        let animDuration = '0.5s';
        let isMoving = false;
        if (isPlayer && !isEditor) {
            const speed = Math.abs(entity.velocity.x);
            isMoving = speed > 10;
            const rawDuration = isMoving ? Math.max(0.3, 80 / speed) : 0;
            animDuration = `${rawDuration}s`;
        }

        return (
          <React.Fragment key={entity.id}>
          {/* Turret Vision Cone Layer (Underneath entity) */}
          {entity.behavior === 'TURRET' && (entity.isVisible || isEditor) && (
              (() => {
                  const range = 500;
                  let angle = 0;
                  let isLocked = false;
                  
                  if (player && player.isVisible && !isEditor) {
                      const dx = (player.pos.x + player.size.x/2) - (entity.pos.x + entity.size.x/2);
                      const dy = (player.pos.y + player.size.y/2) - (entity.pos.y + entity.size.y/2);
                      const dist = Math.sqrt(dx*dx + dy*dy);
                      if (dist < range) {
                          angle = Math.atan2(dy, dx) * (180/Math.PI);
                          isLocked = true;
                      }
                  }
                  
                  // If no lock, animate or face default (left)
                  if (!isLocked) {
                      angle = 180; // Default left
                  }

                  return (
                      <div 
                          className="absolute pointer-events-none transition-transform duration-300"
                          style={{
                              left: entity.pos.x + entity.size.x/2,
                              top: entity.pos.y + entity.size.y/2 - range/2, // Center the div vertically relative to pivot
                              width: range,
                              height: range,
                              transformOrigin: '0 50%', // Pivot is left-center of the div (which is the tip of the cone triangle)
                              transform: `rotate(${angle}deg)`, 
                              zIndex: 5,
                              opacity: isEditor ? 0.2 : 1
                          }}
                      >
                          {/* Cone Gradient */}
                          <div 
                                className="w-full h-full"
                                style={{
                                    background: `radial-gradient(circle at 0 50%, ${isLocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 211, 238, 0.1)'} 0%, transparent 70%)`,
                                    clipPath: 'polygon(0 50%, 100% 0, 100% 100%)',
                                    animation: !isLocked && !isEditor ? 'scan-sweep 4s infinite ease-in-out' : 'none',
                                    transformOrigin: '0 50%' // IMPORTANT: Pivot scan animation around the turret tip
                                }}
                          >
                               {/* Scan line */}
                               <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20 -translate-y-1/2"></div>
                          </div>
                      </div>
                  );
              })()
          )}

          <div
            style={style}
            onMouseDown={(e) => handleMouseDown(e, entity)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectEntity(entity.id);
            }}
            className={`group ${!entity.isStatic && !isEditor ? 'transition-transform duration-75' : ''}`}
          >
             {/* Resize Handle for Walls in Editor */}
            {isEditor && isSelected && entity.type === EntityType.WALL && (
                 <div className="absolute bottom-0 right-0 w-3 h-3 bg-white cursor-nwse-resize border border-black z-50"></div>
            )}

            {/* Player Visuals - Stick Figure Style */}
            {isPlayer && (
              <div 
                className="relative w-full h-full flex flex-col items-center justify-end"
                style={{
                  transform: entity.velocity.x < -0.1 ? 'scaleX(-1)' : 'scaleX(1)'
                }}
              >
                {/* Selection Ring */}
                {isSelected && (
                   <div className="absolute -inset-4 border border-yellow-400 rounded-full animate-spin opacity-60 border-dashed" />
                )}
                
                {/* Glow */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-12 bg-cyan-500/20 blur-md rounded-full pointer-events-none" />

                {/* Figure Container */}
                <div 
                    className="relative flex flex-col items-center pb-1"
                    style={{
                        animation: isMoving ? `walk-bob ${animDuration} infinite ease-in-out` : 'none'
                    }}
                >
                    <div className="w-2.5 h-2.5 bg-cyan-300 border border-cyan-100 shadow-[0_0_8px_rgba(34,211,238,0.9)] z-20 mb-[1px]" />
                    <div className="relative flex flex-col items-center z-10">
                        <div className="w-6 h-0.5 bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.6)]"></div>
                        <div className="w-0.5 h-3 bg-cyan-400 -mt-0.5"></div>
                    </div>
                    <div className="relative w-4 h-4 -mt-0.5">
                         <div 
                            className="absolute top-0 right-1.5 w-0.5 h-full bg-cyan-700 origin-top opacity-80"
                            style={{
                                animation: isMoving ? `walk-leg ${animDuration} infinite linear` : 'none',
                                animationDelay: `calc(${animDuration} / -2)`,
                                transform: 'rotate(15deg)',
                                boxShadow: 'none'
                            }}
                         ></div>
                         <div 
                            className="absolute top-0 left-1.5 w-0.5 h-full bg-cyan-300 origin-top z-10"
                             style={{
                                animation: isMoving ? `walk-leg ${animDuration} infinite linear` : 'none',
                                transform: 'rotate(-15deg)',
                                boxShadow: '0 0 4px rgba(34,211,238,0.4)'
                            }}
                         ></div>
                    </div>
                </div>
              </div>
            )}

            {/* Enemy/Hazard Visuals */}
            {isEnemy && (
               <div className="relative w-full h-full">
                  {isSelected && (
                    <div className="absolute -inset-1 border-2 border-yellow-400 border-dashed opacity-80" />
                  )}
                  {/* Turret vs Standard Enemy */}
                  {entity.behavior === 'TURRET' ? (
                       <div className="w-full h-full bg-slate-800 border-2 border-slate-600 rounded-sm relative flex items-center justify-center">
                            <div className="w-2/3 h-2/3 bg-slate-700 rounded-full border border-slate-500"></div>
                            <div className="absolute w-4 h-10 bg-slate-600 -left-2 top-1/2 -translate-y-1/2 rounded-l"></div>
                            <div className="absolute w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                       </div>
                  ) : (
                    // Standard / Patrol Enemy
                    <>
                    <div className="absolute inset-0 bg-red-600/90 overflow-hidden">
                        <div className="absolute inset-0 opacity-30" 
                                style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #000, #000 10px, transparent 10px, transparent 20px)' }}>
                        </div>
                    </div>
                    <div className="absolute inset-0 border-2 border-red-500 animate-pulse"></div>
                    {isDeadly && (
                        <div className="absolute -top-2 left-0 right-0 h-2 bg-transparent" style={{ backgroundImage: `linear-gradient(45deg, transparent 50%, ${COLORS.deadly} 50%), linear-gradient(-45deg, transparent 50%, ${COLORS.deadly} 50%)`, backgroundSize: '10px 10px' }}></div>
                    )}
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-white/50 animate-ping"></div>
                    </>
                  )}
               </div>
            )}

            {/* Projectile Visuals */}
            {isProjectile && (
                 <div className="relative w-full h-full">
                      <div className="absolute inset-0 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.8)]"></div>
                      <div className="absolute inset-0 border-2 border-white rounded-full opacity-50" style={{ animation: 'projectile-spin 0.5s linear infinite' }}></div>
                 </div>
            )}

            {/* Hover Label */}
            {!isEditor && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-cyan-400 border border-cyan-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none font-mono shadow-xl backdrop-blur-sm">
                <span className="text-slate-500 mr-1">{'>'}</span>{entity.name} 
                {entity.isLocked ? " [LOCKED]" : ""}
                {entity.isDeadly ? " [DEADLY]" : ""}
                {entity.isAlwaysVisible ? " [SECURE]" : ""}
                </div>
            )}

            {/* Entity Content */}
            {entity.type === EntityType.TEXT && (
                <span className="font-mono text-xs text-shadow-sm whitespace-nowrap" style={{ textShadow: '0 0 5px currentColor' }}>
                    {entity.label}
                </span>
            )}
            
            {entity.type === EntityType.EXIT && (
                 <div className="w-full h-full flex items-center justify-center relative">
                    <div className="absolute inset-0 border-2 border-white/50 animate-pulse rounded-sm"></div>
                    <div className="absolute inset-2 border border-white/30 rounded-sm"></div>
                    <div className="text-[8px] font-bold text-white tracking-widest bg-black px-1">EXIT</div>
                 </div>
            )}
            
            {entity.isLocked && isDoor && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 bg-red-500/50 rounded-full animate-ping"></div>
                    <div className="absolute w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
            )}
          </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};