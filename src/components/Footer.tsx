import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getCurrentDateTimeFormatted } from '../utils/exportUtils';

export const Footer: React.FC = () => {
  const [currentDateTime, setCurrentDateTime] = useState<string>(getCurrentDateTimeFormatted());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(getCurrentDateTimeFormatted());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="no-print w-full bg-slate-900/95 border-t border-slate-800/90 py-3 px-4 text-center text-xs text-slate-400 select-none z-20">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-1">
        <p className="font-medium text-slate-300">
          Copyright SAL: Sistema de Acompanhamento de Leitura © 2026 | Criado por{' '}
          <strong className="text-white font-semibold">Thiago Marques Lopes</strong>
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono tracking-wider">
          <Clock className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>{currentDateTime}</span>
        </div>
      </div>
    </footer>
  );
};
