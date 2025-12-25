/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useState, useEffect } from 'react';
import { ArrowUpTrayIcon, SparklesIcon, CpuChipIcon } from '@heroicons/react/24/outline';

interface InputAreaProps {
  onGenerate: (prompt: string, file?: File) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const CyclingText = () => {
    const words = [
        "a NAPKIN SKETCH",
        "a WHITEBOARD",
        "a BLUEPRINT",
        "a CIRCUIT DIAGRAM",
        "an ENGINE PART",
        "a FLOOR PLAN"
    ];
    const [index, setIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false); // fade out
            setTimeout(() => {
                setIndex(prev => (prev + 1) % words.length);
                setFade(true); // fade in
            }, 500); // Wait for fade out
        }, 3000); // Slower cycle to read longer text
        return () => clearInterval(interval);
    }, [words.length]);

    return (
        <span className={`inline-block whitespace-nowrap transition-all duration-500 transform ${fade ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-2 blur-sm'} text-blue-400 font-bold tracking-widest pb-1 border-b-2 border-blue-500`}>
            {words[index]}
        </span>
    );
};

export const InputArea: React.FC<InputAreaProps> = ({ onGenerate, isGenerating, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      onGenerate("", file);
    } else {
      alert("Please upload an image or PDF.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isGenerating) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [disabled, isGenerating]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!disabled && !isGenerating) {
        setIsDragging(true);
    }
  }, [disabled, isGenerating]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto perspective-1000">
      <div 
        className={`relative group transition-all duration-500 ease-out ${isDragging ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
      >
        <label
          className={`
            relative flex flex-col items-center justify-center
            h-56 sm:h-64 md:h-[24rem]
            glass-panel
            rounded-xl
            cursor-pointer overflow-hidden
            transition-all duration-500
            ${isDragging 
              ? 'border-blue-500/50 bg-blue-900/10 shadow-[0_0_50px_rgba(59,130,246,0.2)]' 
              : 'border-zinc-800 hover:border-zinc-600'
            }
            ${isGenerating ? 'pointer-events-none opacity-50 grayscale' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
            {/* Holographic Scanning Grid */}
            <div className={`absolute inset-0 transition-opacity duration-500 ${isDragging ? 'opacity-20' : 'opacity-[0.05]'}`} 
                 style={{
                     backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(59, 130, 246, .3) 25%, rgba(59, 130, 246, .3) 26%, transparent 27%, transparent 74%, rgba(59, 130, 246, .3) 75%, rgba(59, 130, 246, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(59, 130, 246, .3) 25%, rgba(59, 130, 246, .3) 26%, transparent 27%, transparent 74%, rgba(59, 130, 246, .3) 75%, rgba(59, 130, 246, .3) 76%, transparent 77%, transparent)',
                     backgroundSize: '50px 50px'
                 }}>
            </div>
            
            {/* Tech Corners (The "Futuristic Frame" look) */}
            <div className={`absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 transition-all duration-300 ${isDragging ? 'border-blue-400 w-12 h-12' : 'border-zinc-600'}`}></div>
            <div className={`absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 transition-all duration-300 ${isDragging ? 'border-blue-400 w-12 h-12' : 'border-zinc-600'}`}></div>
            <div className={`absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 transition-all duration-300 ${isDragging ? 'border-blue-400 w-12 h-12' : 'border-zinc-600'}`}></div>
            <div className={`absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 transition-all duration-300 ${isDragging ? 'border-blue-400 w-12 h-12' : 'border-zinc-600'}`}></div>

            {/* Scanning Laser (Only when dragging or generating) */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_#3b82f6] transition-all duration-[2000ms] ease-in-out ${isDragging || isGenerating ? 'opacity-100 top-[100%]' : 'opacity-0 top-0'}`}></div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-6 md:space-y-8 p-6 md:p-8 w-full">
                <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-500 ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {/* Glowing Ring */}
                    <div className={`absolute inset-0 rounded-full border border-blue-500/30 ${isDragging ? 'animate-ping opacity-20' : 'opacity-0'}`}></div>
                    
                    <div className={`relative w-full h-full rounded-full glass-panel border-zinc-700 flex items-center justify-center shadow-2xl ${isGenerating ? 'animate-pulse' : ''}`}>
                        {isGenerating ? (
                            <CpuChipIcon className="w-10 h-10 text-blue-400 animate-spin-slow" />
                        ) : (
                            <ArrowUpTrayIcon className={`w-10 h-10 text-zinc-400 transition-all duration-300 ${isDragging ? '-translate-y-1 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'group-hover:text-zinc-200'}`} />
                        )}
                    </div>
                </div>

                <div className="space-y-4 md:space-y-6 w-full max-w-3xl">
                    <h3 className="flex flex-col items-center justify-center text-xl sm:text-2xl md:text-4xl text-white leading-none font-bold tracking-tight gap-3 font-mono">
                        <span className="text-zinc-400 text-sm md:text-base tracking-[0.2em] uppercase mb-2">Initialize Sequence</span>
                        <div className="h-8 sm:h-10 md:h-14 flex items-center justify-center w-full">
                           <span>SCAN </span>
                           <span className="mx-3"><CyclingText /></span>
                        </div>
                    </h3>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-zinc-500 text-xs sm:text-sm font-mono uppercase tracking-widest">
                            <span className="hidden md:inline">Drag & Drop Target File</span>
                            <span className="md:hidden">Tap to Upload</span>
                        </p>
                        <div className="flex gap-2 text-[10px] text-zinc-600 font-mono border border-zinc-800 rounded px-2 py-1">
                            <span>JPG</span>
                            <span>PNG</span>
                            <span>PDF</span>
                            <span>WEBP</span>
                        </div>
                    </div>
                </div>
            </div>

            <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={isGenerating || disabled}
            />
        </label>
      </div>
    </div>
  );
};
