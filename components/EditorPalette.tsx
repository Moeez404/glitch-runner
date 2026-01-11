import React from 'react';
import { EntityType } from '../types';
import { Box, Skull, Key, Type, DoorOpen, LogOut, Crosshair } from 'lucide-react';
import { COLORS } from '../constants';

interface EditorPaletteProps {
  onDragStart: (type: EntityType, e: React.DragEvent) => void;
}

export const EditorPalette: React.FC<EditorPaletteProps> = ({ onDragStart }) => {
  const tools = [
    { type: EntityType.WALL, icon: Box, label: 'Wall / Floor', color: COLORS.wall },
    { type: EntityType.PLATFORM, icon: Box, label: 'Platform', color: COLORS.platform },
    { type: EntityType.ENEMY, icon: Skull, label: 'Enemy (Patrol)', color: COLORS.enemy },
    { type: EntityType.PROJECTILE, icon: Crosshair, label: 'Turret', color: COLORS.turret }, // We use Projectile icon for Turret builder
    { type: EntityType.DOOR, icon: DoorOpen, label: 'Door (Locked)', color: COLORS.doorLocked },
    { type: EntityType.EXIT, icon: LogOut, label: 'Level Exit', color: '#ffffff' },
    { type: EntityType.TEXT, icon: Type, label: 'Text / Hint', color: COLORS.text },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-xl z-20">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-2">
        Construction Kit
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {tools.map((tool) => (
          <div
            key={tool.type}
            draggable
            onDragStart={(e) => onDragStart(tool.type, e)}
            className="flex items-center gap-3 p-3 rounded bg-slate-800 border border-slate-700 hover:border-cyan-500 hover:bg-slate-700 cursor-grab active:cursor-grabbing transition-all group"
          >
            <div 
                className="w-8 h-8 rounded flex items-center justify-center border border-slate-600"
                style={{ backgroundColor: tool.color + '40', color: tool.color }} // 40 is hex opacity
            >
                <tool.icon size={18} />
            </div>
            <span className="text-sm text-slate-300 font-mono group-hover:text-cyan-400">
                {tool.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto text-[10px] text-slate-600 p-2 bg-slate-950 rounded border border-slate-800">
        <p className="mb-1 text-cyan-500 font-bold">INSTRUCTIONS:</p>
        <p>1. Drag items to canvas.</p>
        <p>2. Click items to edit/move.</p>
        <p>3. Use Inspector to set logic.</p>
      </div>
    </div>
  );
};