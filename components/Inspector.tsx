import React from 'react';
import { GameEntity, GlobalPhysics, EntityType, Vector2 } from '../types';
import { Terminal, Cpu, Lock, Unlock, Eye, EyeOff, Box, Activity, Skull, Move, ShieldAlert, Route, Trash2, Settings, Zap } from 'lucide-react';

interface InspectorProps {
  entity: GameEntity | null;
  physics: GlobalPhysics;
  onUpdateEntity: (id: string, updates: Partial<GameEntity>) => void;
  onUpdatePhysics: (updates: Partial<GlobalPhysics>) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onPlayClickSound: () => void;
  isEditor?: boolean;
  onDeleteEntity?: (id: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({ 
  entity, 
  physics, 
  onUpdateEntity, 
  onUpdatePhysics,
  isPaused,
  onTogglePause,
  onPlayClickSound,
  isEditor,
  onDeleteEntity
}) => {

  const handlePhysicsChange = (key: keyof GlobalPhysics, value: number) => {
    onUpdatePhysics({ [key]: value });
  };

  const handleEntityChange = (key: keyof GameEntity, value: any) => {
    if (entity) {
      onPlayClickSound();
      onUpdateEntity(entity.id, { [key]: value });
    }
  };

  const handleBehaviorChange = (newBehavior: 'DEFAULT' | 'PATROL' | 'TURRET') => {
      if (!entity) return;
      
      const updates: Partial<GameEntity> = { behavior: newBehavior };
      
      // Initialize defaults when switching behaviors
      if (newBehavior === 'PATROL') {
          updates.patrolStart = entity.patrolStart || { ...entity.pos };
          updates.patrolEnd = entity.patrolEnd || { x: entity.pos.x + 100, y: entity.pos.y };
          updates.patrolSpeed = entity.patrolSpeed || 100;
          updates.isStatic = false; // Patrols must move
      } else if (newBehavior === 'TURRET') {
          updates.fireRate = entity.fireRate || 2000;
          updates.projectileSpeed = entity.projectileSpeed || 300;
          updates.isStatic = true;
      } else {
          // Default
          updates.isStatic = true; 
      }
      
      handleEntityChange('behavior', newBehavior);
      // We also apply the defaults
      onUpdateEntity(entity.id, updates);
  };

  return (
    <div className="h-full bg-slate-900 border-l border-cyan-900 p-4 font-mono text-sm flex flex-col overflow-y-auto w-80 min-w-[320px] shadow-2xl relative z-10 shrink-0">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-cyan-800 pb-2">
        <div className="flex items-center gap-2 text-cyan-400">
          <Terminal size={18} />
          <span className="font-bold tracking-wider">{isEditor ? 'BUILDER_V1' : 'PROPERTIES.EXE'}</span>
        </div>
        <button 
          onClick={() => {
              onPlayClickSound();
              onTogglePause();
          }}
          className={`px-2 py-1 text-xs rounded border ${isPaused ? 'border-yellow-500 text-yellow-500 animate-pulse' : 'border-slate-700 text-slate-500'}`}
        >
          {isPaused ? 'PAUSED' : 'RUNNING'}
        </button>
      </div>

      {/* Global Physics Section */}
      <div className="mb-8">
        <h3 className="text-slate-500 mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
          <Activity size={12} /> World Physics
        </h3>
        <div className="space-y-3 pl-2 border-l-2 border-slate-800">
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-xs">gravity_constant</label>
            <div className="flex gap-2">
              <input 
                type="range" 
                min="-1.0" max="2.0" step="0.1"
                value={physics.gravity}
                onChange={(e) => handlePhysicsChange('gravity', parseFloat(e.target.value))}
                className="flex-1 accent-cyan-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-cyan-500 w-12 text-right">{physics.gravity.toFixed(1)}</span>
            </div>
          </div>
          
           <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-xs">time_dilation</label>
            <div className="flex gap-2">
              <input 
                type="range" 
                min="0.1" max="2.0" step="0.1"
                value={physics.timeScale}
                onChange={(e) => handlePhysicsChange('timeScale', parseFloat(e.target.value))}
                className="flex-1 accent-purple-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-purple-500 w-12 text-right">{physics.timeScale.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Entity Inspector Section */}
      <div className="flex-1">
        <h3 className="text-slate-500 mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
          <Cpu size={12} /> Object Inspector
        </h3>
        
        {!entity ? (
          <div className="text-slate-600 italic p-4 border border-dashed border-slate-800 rounded text-center">
            [ NO_SELECTION ]<br/>
            <span className="text-xs">Click an entity to inspect logic</span>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Identity */}
            <div className="bg-slate-950 p-3 rounded border border-cyan-900/50 relative overflow-hidden">
               {entity.isAlwaysVisible && (
                   <div className="absolute top-1 right-1 text-red-500/50" title="Security hardened: Visibility Locked">
                       <ShieldAlert size={14} />
                   </div>
               )}
               
               {isEditor ? (
                    <div className="flex flex-col gap-2">
                        <input 
                            value={entity.name}
                            onChange={(e) => handleEntityChange('name', e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-cyan-400 font-bold px-1 text-sm rounded w-full"
                        />
                         <input 
                            value={entity.label || ""}
                            placeholder="Text Label..."
                            onChange={(e) => handleEntityChange('label', e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-400 text-xs px-1 rounded w-full"
                            style={{ display: entity.type === EntityType.TEXT ? 'block' : 'none' }}
                        />
                    </div>
               ) : (
                   <>
                    <div className="text-cyan-400 font-bold mb-1">{entity.name}</div>
                    <div className="text-slate-500 text-xs font-mono">{entity.id}</div>
                    {entity.description && <div className="text-slate-400 text-xs mt-2 italic">"{entity.description}"</div>}
                   </>
               )}
            </div>

            {/* Behavior Logic (Moved up for importance) */}
            {isEditor && entity.type !== EntityType.PLAYER && entity.type !== EntityType.EXIT && (
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                     <div className="flex items-center gap-2 mb-2 text-purple-400">
                          <Settings size={14} />
                          <span className="text-xs uppercase font-bold tracking-wider">Behavior Logic</span>
                      </div>
                      <select 
                        value={entity.behavior || 'DEFAULT'}
                        onChange={(e) => handleBehaviorChange(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-slate-300 mb-2"
                      >
                          <option value="DEFAULT">Static / Simple Physics</option>
                          <option value="PATROL">Patrol / Moving Platform</option>
                          <option value="TURRET">Turret / Spawner</option>
                      </select>
                </div>
            )}

            {/* Scale / Dimensions (Available for non-text/non-player items in Editor) */}
            {isEditor && entity.type !== EntityType.PLAYER && entity.type !== EntityType.TEXT && (
                <div className="bg-slate-800/50 p-2 rounded">
                    <label className="text-xs text-slate-400 mb-1 block">dimensions (w / h)</label>
                    <div className="grid grid-cols-2 gap-2">
                         <div className="relative">
                             <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">W</span>
                             <input 
                                type="number" 
                                value={entity.size.x}
                                onChange={(e) => handleEntityChange('size', { ...entity.size, x: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded pl-4 pr-1 text-xs font-mono text-cyan-300"
                              />
                         </div>
                         <div className="relative">
                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">H</span>
                            <input 
                                type="number" 
                                value={entity.size.y}
                                onChange={(e) => handleEntityChange('size', { ...entity.size, y: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded pl-4 pr-1 text-xs font-mono text-cyan-300"
                            />
                         </div>
                    </div>
                </div>
            )}

            {/* Patrol Config */}
            {entity.behavior === 'PATROL' && (
               <div className="bg-slate-800/50 p-2 rounded border border-slate-700 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2 text-yellow-500">
                      <Route size={14} />
                      <span className="text-xs uppercase font-bold tracking-wider">Patrol Vector</span>
                  </div>
                  
                  {isEditor && (
                      <div className="text-[10px] text-slate-500 mb-2 italic">
                          Tip: Moving the entity in editor updates Start Pos.
                      </div>
                  )}

                  <div className="space-y-2">
                      <div>
                          <label className="text-[10px] text-slate-500 uppercase block mb-1">Start Pos (X,Y)</label>
                          <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="number" 
                                value={entity.patrolStart?.x || 0}
                                onChange={(e) => handleEntityChange('patrolStart', { ...entity.patrolStart, x: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-1 text-xs font-mono text-yellow-300"
                              />
                              <input 
                                type="number" 
                                value={entity.patrolStart?.y || 0}
                                onChange={(e) => handleEntityChange('patrolStart', { ...entity.patrolStart, y: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-1 text-xs font-mono text-yellow-300"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="text-[10px] text-slate-500 uppercase block mb-1">End Pos (X,Y)</label>
                          <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="number" 
                                value={entity.patrolEnd?.x || 0}
                                onChange={(e) => handleEntityChange('patrolEnd', { ...entity.patrolEnd, x: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-1 text-xs font-mono text-yellow-300"
                              />
                              <input 
                                type="number" 
                                value={entity.patrolEnd?.y || 0}
                                onChange={(e) => handleEntityChange('patrolEnd', { ...entity.patrolEnd, y: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-1 text-xs font-mono text-yellow-300"
                              />
                          </div>
                      </div>
                      <div>
                         <label className="text-[10px] text-slate-500 uppercase block mb-1">Speed</label>
                         <input 
                            type="number" 
                            value={entity.patrolSpeed || 100}
                            onChange={(e) => handleEntityChange('patrolSpeed', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1 text-xs font-mono text-yellow-300"
                         />
                      </div>
                  </div>
               </div>
            )}

            {/* Turret Config */}
            {entity.behavior === 'TURRET' && (
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2 text-red-500">
                        <Zap size={14} />
                        <span className="text-xs uppercase font-bold tracking-wider">Turret Config</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-slate-400 text-xs flex justify-between">
                                <span>Fire Rate (ms)</span>
                            </label>
                            <input 
                                type="number" 
                                value={entity.fireRate || 2000}
                                onChange={(e) => handleEntityChange('fireRate', parseFloat(e.target.value) || 2000)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-1 text-xs font-mono text-red-300"
                            />
                        </div>
                         <div className="flex flex-col gap-1">
                            <label className="text-slate-400 text-xs flex justify-between">
                                <span>Projectile Speed</span>
                            </label>
                            <input 
                                type="number" 
                                value={entity.projectileSpeed || 300}
                                onChange={(e) => handleEntityChange('projectileSpeed', parseFloat(e.target.value) || 300)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-1 text-xs font-mono text-red-300"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Editable Properties */}
            <div className="space-y-3">
              
              {/* Boolean Toggles */}
              <div className="grid grid-cols-2 gap-2">
                 {/* Locked */}
                {entity.isLocked !== undefined && (
                   <button 
                    onClick={() => handleEntityChange('isLocked', !entity.isLocked)}
                    className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all
                      ${entity.isLocked ? 'border-red-500/50 bg-red-950/20 text-red-400' : 'border-green-500/50 bg-green-950/20 text-green-400'}
                    `}
                   >
                     {entity.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                     <span className="text-[10px] uppercase">isLocked</span>
                   </button>
                )}

                 {/* Solid */}
                 <button 
                  onClick={() => handleEntityChange('isSolid', !entity.isSolid)}
                  className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all
                    ${entity.isSolid ? 'border-slate-500 bg-slate-800 text-slate-200' : 'border-slate-700 bg-transparent text-slate-600'}
                  `}
                 >
                   <Box size={16} />
                   <span className="text-[10px] uppercase">isSolid</span>
                 </button>

                 {/* Visible */}
                 <button 
                  disabled={entity.isAlwaysVisible}
                  onClick={() => handleEntityChange('isVisible', !entity.isVisible)}
                  className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden
                    ${entity.isVisible 
                        ? (entity.isAlwaysVisible ? 'border-red-900/50 bg-slate-900 text-slate-500 cursor-not-allowed' : 'border-cyan-500/30 bg-cyan-900/20 text-cyan-300') 
                        : 'border-slate-700 bg-transparent text-slate-600'}
                  `}
                 >
                   {entity.isAlwaysVisible && <div className="absolute inset-0 bg-stripes-gray opacity-10"></div>}
                   {entity.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                   <span className="text-[10px] uppercase">{entity.isAlwaysVisible ? 'LOCKED' : 'isVisible'}</span>
                 </button>

                 {/* Static (Gravity) */}
                 <button 
                  onClick={() => handleEntityChange('isStatic', !entity.isStatic)}
                  className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all
                    ${entity.isStatic ? 'border-blue-500/50 bg-blue-900/20 text-blue-300' : 'border-orange-500/50 bg-orange-900/20 text-orange-300'}
                  `}
                 >
                   <Move size={16} />
                   <span className="text-[10px] uppercase">{entity.isStatic ? 'STATIC' : 'DYNAMIC'}</span>
                 </button>

                 {/* Deadly */}
                 <button 
                    onClick={() => handleEntityChange('isDeadly', !entity.isDeadly)}
                    className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all col-span-2
                    ${entity.isDeadly ? 'border-red-600 bg-red-900/40 text-red-200 animate-pulse' : 'border-slate-700 bg-transparent text-slate-600'}
                    `}
                >
                    <Skull size={16} />
                    <span className="text-[10px] uppercase">isDeadly</span>
                </button>
              </div>

               {/* Gravity Scale */}
               <div className="bg-slate-800/30 p-2 rounded">
                   <div className="flex flex-col gap-1">
                        <label className="text-slate-400 text-xs flex justify-between">
                            <span>gravity_scale</span>
                        </label>
                        <div className="flex gap-2 items-center">
                        <input 
                            type="range" 
                            min="-2.0" max="5.0" step="0.5"
                            value={entity.gravityScale !== undefined ? entity.gravityScale : 1}
                            onChange={(e) => handleEntityChange('gravityScale', parseFloat(e.target.value))}
                            className="flex-1 accent-orange-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-orange-400 text-xs w-8 text-right">{entity.gravityScale?.toFixed(1) || "1.0"}</span>
                        </div>
                    </div>
               </div>

               {/* Delete Button (Editor Only) */}
               {isEditor && onDeleteEntity && (
                   <button 
                    onClick={() => onDeleteEntity(entity.id)}
                    className="w-full p-2 bg-red-900/30 border border-red-800 text-red-400 rounded hover:bg-red-800/50 hover:text-white transition-colors flex items-center justify-center gap-2 mt-4"
                   >
                       <Trash2 size={14} /> DELETE ENTITY
                   </button>
               )}

            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 text-[10px] text-slate-600 text-center font-mono">
        GLITCH_OS v1.3.3 [ROOT]
      </div>
    </div>
  );
};