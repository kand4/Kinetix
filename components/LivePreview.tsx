/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownTrayIcon, PlusIcon, ViewColumnsIcon, DocumentIcon, CodeBracketIcon, XMarkIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, ViewfinderCircleIcon, ChevronDownIcon, SparklesIcon, PlayIcon, PauseIcon, WrenchScrewdriverIcon, CommandLineIcon, BoltIcon, EyeIcon, BeakerIcon, ExclamationTriangleIcon, CheckCircleIcon, LinkIcon, CameraIcon, GlobeAltIcon, PhotoIcon, CpuChipIcon, CogIcon, CubeIcon } from '@heroicons/react/24/outline';
import { Creation } from './CreationHistory';
import { refineSimulation, locateObject, generateSchematicOverlay, analyzeBiologicalEntity, BioData, analyzeTechnicalComponent, TechData } from '../services/gemini'; // Import new services

interface LivePreviewProps {
  creation: Creation | null;
  isLoading: boolean;
  isFocused: boolean;
  onReset: () => void;
  onAskQuestion?: (question: string, croppedBase64?: string) => Promise<string>;
  modelId: string; // NEW PROP: The selected AI Model ID
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const LoadingStep = ({ text, active, completed }: { text: string, active: boolean, completed: boolean }) => (
    <div className={`flex items-center space-x-3 transition-all duration-500 ${active || completed ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-4'}`}>
        <div className={`w-4 h-4 flex items-center justify-center ${completed ? 'text-green-400' : active ? 'text-blue-400' : 'text-zinc-700'}`}>
            {completed ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : active ? (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
            ) : (
                <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div>
            )}
        </div>
        <span className={`font-mono text-xs tracking-wide uppercase ${active ? 'text-zinc-200' : completed ? 'text-zinc-400 line-through' : 'text-zinc-600'}`}>{text}</span>
    </div>
  );

// Smart Button with PRECISION CROSSHAIR & AUTO-PILOT
const SmartFloatingButton = ({ 
    onDragStart, 
    onDragEnd,
    onMove,
    isScanning,
    moveTo // New prop for Auto-Pilot
}: { 
    onDragStart: () => void, 
    onDragEnd: (x: number, y: number) => void,
    onMove: (x: number, y: number) => void,
    isScanning: boolean,
    moveTo?: { x: number, y: number } | null
}) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 100, y: 150 });
    const [isDragging, setIsDragging] = useState(false);
    const [isAutoPiloting, setIsAutoPiloting] = useState(false);
    
    // Offset now tracks the mouse relative to the PROBE BODY Top-Left
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Handle Auto-Pilot Movement
    useEffect(() => {
        if (moveTo) {
            setIsAutoPiloting(true);
            setPosition({ x: moveTo.x, y: moveTo.y });
            
            // Calculate tip position for the move callback
            // Geometry: Body (56px) -> Center is 28px. Stem+Box = 80px vertical offset for tip.
            const tipX = moveTo.x + 28;
            const tipY = moveTo.y + 80;
            
            // Wait for transition to finish before triggering "End" (scan)
            const timer = setTimeout(() => {
                setIsAutoPiloting(false);
                onMove(tipX, tipY); // Update Loupe
                onDragEnd(tipX, tipY); // Trigger Scan
            }, 1000); // 1s animation duration
            return () => clearTimeout(timer);
        }
    }, [moveTo]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setIsAutoPiloting(false); // Manual override cancels auto-pilot
        onDragStart();
        // Calculate offset so the mouse stays exactly where it grabbed relative to the button
        setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        setIsAutoPiloting(false);
        onDragStart();
        const touch = e.touches[0];
        setDragOffset({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    // Helper to calculate tip position based on current top-left
    const getTipPosition = (currentX: number, currentY: number) => {
        return {
            x: currentX + 28,
            y: currentY + 80
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                setPosition({ x: newX, y: newY });
                
                const tip = getTipPosition(newX, newY);
                onMove(tip.x, tip.y);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging) {
                const touch = e.touches[0];
                const newX = touch.clientX - dragOffset.x;
                const newY = touch.clientY - dragOffset.y;
                setPosition({ x: newX, y: newY });
                
                const tip = getTipPosition(newX, newY);
                onMove(tip.x, tip.y);
            }
        };

        const handleEnd = (e: MouseEvent | TouchEvent) => {
            if (isDragging) {
                setIsDragging(false);
                
                const tip = getTipPosition(position.x, position.y);
                onDragEnd(tip.x, tip.y);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, dragOffset, onDragEnd, onMove, position]);

    return createPortal(
        <div 
            className="fixed z-[10000] cursor-move touch-none select-none group"
            style={{ 
                left: `${position.x}px`, 
                top: `${position.y}px`,
                // Use CSS transition for Auto-Pilot smoothness, disable it for dragging
                transition: isDragging ? 'none' : 'left 1s cubic-bezier(0.2, 0.8, 0.2, 1), top 1s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s',
                transform: isDragging ? 'scale(1.0)' : 'scale(1)'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            {/* Probe Body */}
            <div className="relative w-14 flex flex-col items-center">
                
                {/* Visual Rings */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 bg-blue-500/20 rounded-full pointer-events-none ${isDragging || isScanning || isAutoPiloting ? 'animate-ping' : ''}`}></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -inset-1 bg-blue-400/10 rounded-full blur-sm w-16 h-16 pointer-events-none"></div>
                
                {/* Main Probe Body */}
                <div className={`
                    relative w-14 h-14 backdrop-blur-xl border rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-colors duration-300 z-20
                    ${isScanning ? 'bg-blue-900/90 border-blue-400' : 'bg-zinc-900/90 border-blue-500/50'}
                `}>
                    {isScanning ? (
                        <BoltIcon className="w-6 h-6 text-white animate-pulse" />
                    ) : (
                        <SparklesIcon className="w-6 h-6 text-blue-400" />
                    )}
                </div>

                {/* THE PRECISION CROSSHAIR TIP */}
                <div className={`flex flex-col items-center transition-all duration-200 z-10 ${isDragging || isAutoPiloting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="w-0.5 h-4 bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                    <div className="relative w-4 h-4 flex items-center justify-center">
                        <div className="absolute inset-0 border border-blue-500/80 rounded-sm bg-blue-500/10"></div>
                        <div className="w-px h-full bg-blue-500/60"></div>
                        <div className="h-px w-full bg-blue-500/60 absolute"></div>
                        <div className="absolute w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444] z-20"></div>
                    </div>
                </div>

                {/* Status LED */}
                <div className={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-zinc-900 transition-colors z-30 ${isDragging ? 'bg-red-500 animate-pulse' : isScanning ? 'bg-blue-400 animate-ping' : 'bg-green-500'}`}></div>

                {/* Label */}
                <div className={`
                    absolute left-16 top-4 
                    bg-black/90 text-white text-xs font-mono px-3 py-1.5 rounded-lg border border-zinc-800 
                    shadow-xl whitespace-nowrap pointer-events-none transition-all duration-300 z-20
                    ${isScanning ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0'}
                `}>
                    {isScanning ? 'ANALYZING...' : isAutoPiloting ? 'NAVIGATING...' : isDragging ? 'ALIGN RED DOT' : 'Ready'}
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- NEW COMPONENT: BIO DATA CARD ---
const BioDataCard = ({ data, onClose }: { data: BioData, onClose: () => void }) => {
    return (
        <div className="absolute top-20 right-4 md:right-8 z-50 w-80 md:w-96 animate-in slide-in-from-right-10 duration-500">
            <div className={`glass-panel rounded-xl overflow-hidden border ${data.isDangerous ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]'}`}>
                
                {/* Header with Classification */}
                <div className={`p-4 border-b ${data.isDangerous ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30'} flex items-start justify-between`}>
                    <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{data.commonName}</h3>
                        <p className="text-xs font-mono italic opacity-80">{data.scientificName}</p>
                        <span className="inline-block mt-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                            {data.family}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Safety Status */}
                <div className={`px-4 py-2 flex items-center space-x-2 text-xs font-bold uppercase tracking-widest ${data.isDangerous ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}>
                    {data.isDangerous ? <ExclamationTriangleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                    <span>{data.safetyNote || (data.isDangerous ? "CAUTION: DANGEROUS" : "SAFE / HARMLESS")}</span>
                </div>

                {/* Details Body */}
                <div className="p-4 space-y-4 bg-zinc-900/90">
                    
                    {/* ANATOMICAL FEATURE BADGE */}
                    {data.anatomicalFeature && (
                        <div className="flex items-center space-x-2 bg-blue-900/20 border border-blue-500/30 px-3 py-2 rounded-lg">
                            <ViewfinderCircleIcon className="w-5 h-5 text-blue-400 animate-pulse" />
                            <div>
                                <div className="text-[9px] uppercase tracking-widest text-blue-500/80 font-bold">Target Focus</div>
                                <div className="text-sm font-bold text-blue-100">{data.anatomicalFeature}</div>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        {data.description}
                    </p>

                    {/* Confidence Meter */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase text-zinc-500 font-mono">
                            <span>AI Confidence</span>
                            <span>{data.confidence}%</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${data.confidence > 80 ? 'bg-blue-400' : data.confidence > 50 ? 'bg-yellow-400' : 'bg-red-400'}`} 
                                style={{ width: `${data.confidence}%` }}
                            ></div>
                        </div>
                        {data.confidence < 60 && data.photographyTips && (
                            <div className="mt-2 flex items-start space-x-2 text-xs text-yellow-400/90 bg-yellow-900/10 p-2 rounded border border-yellow-500/20">
                                <CameraIcon className="w-4 h-4 shrink-0" />
                                <span>{data.photographyTips}</span>
                            </div>
                        )}
                    </div>

                    {/* External Links */}
                    {data.links.length > 0 && (
                        <div className="pt-2 border-t border-zinc-800">
                            <p className="text-[10px] uppercase text-zinc-500 font-mono mb-2">Verification Sources</p>
                            <div className="space-y-2">
                                {data.links.map((link, idx) => (
                                    <a 
                                        key={idx} 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors group"
                                    >
                                        <span className="text-xs text-blue-400 group-hover:text-blue-300 truncate max-w-[200px]">{link.title || link.url}</span>
                                        <LinkIcon className="w-3 h-3 text-zinc-500" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- NEW COMPONENT: TECH DATA CARD (BLUEPRINT STYLE) ---
const TechDataCard = ({ data, onClose }: { data: TechData, onClose: () => void }) => {
    return (
        <div className="absolute top-20 right-4 md:right-8 z-50 w-80 md:w-96 animate-in slide-in-from-right-10 duration-500">
            <div className="glass-panel rounded-xl overflow-hidden border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] bg-[#0B1215]">
                
                {/* Industrial Header */}
                <div className="p-4 border-b border-cyan-500/30 bg-cyan-950/30 flex items-start justify-between relative overflow-hidden">
                    {/* Decorative Scanlines */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <CpuChipIcon className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Tech-Scan</h3>
                        </div>
                        <h2 className="text-lg font-bold text-white leading-tight uppercase font-mono">{data.componentName}</h2>
                        <p className="text-xs text-cyan-200/60 mt-0.5">{data.parentSystem}</p>
                    </div>
                    <button onClick={onClose} className="text-cyan-500/50 hover:text-cyan-400 relative z-10">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Scale Model Alert */}
                {data.isScaleModel && (
                    <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-2">
                        <CubeIcon className="w-3 h-3" />
                        <span>Scale Model / Replica Detected</span>
                    </div>
                )}

                {/* Body */}
                <div className="p-4 space-y-4 bg-[#080c0e]">
                    
                    {/* Functional Analysis */}
                    <div className="relative pl-3 border-l-2 border-cyan-800">
                        <p className="text-xs text-cyan-600 font-mono mb-1 uppercase tracking-wider">Functional Analysis</p>
                        <p className="text-sm text-zinc-300 leading-relaxed font-light">
                            {data.function}
                        </p>
                    </div>

                    {/* NEW: Confidence / Accuracy Meter */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase text-cyan-600 font-mono">
                            <span>System Confidence</span>
                            <span>{data.confidence || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-cyan-950 rounded-full overflow-hidden border border-cyan-900">
                            <div 
                                className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" 
                                style={{ width: `${data.confidence || 0}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-cyan-900/10 border border-cyan-800/30 p-2 rounded">
                            <div className="text-[9px] text-cyan-500 uppercase font-mono mb-1">Material</div>
                            <div className="text-xs text-white flex items-center gap-1.5">
                                <BeakerIcon className="w-3 h-3 text-cyan-400" />
                                {data.material || "Unknown"}
                            </div>
                        </div>
                        <div className="bg-cyan-900/10 border border-cyan-800/30 p-2 rounded">
                            <div className="text-[9px] text-cyan-500 uppercase font-mono mb-1">Complexity</div>
                            <div className="text-xs text-white flex items-center gap-1.5">
                                <CogIcon className="w-3 h-3 text-cyan-400" />
                                {data.complexity || "Standard"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Decor */}
                <div className="h-1 w-full bg-cyan-900/50 flex">
                    <div className="w-1/3 bg-cyan-500/50"></div>
                    <div className="w-1/3 bg-transparent"></div>
                    <div className="w-1/3 bg-cyan-500/20"></div>
                </div>
            </div>
        </div>
    );
};

const PdfRenderer = ({ dataUrl }: { dataUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderPdf = async () => {
      if (!window.pdfjsLib) {
        setError("PDF library not initialized");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const loadingTask = window.pdfjsLib.getDocument(dataUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 2.0 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        setLoading(false);
      } catch (err) {
        console.error("Error rendering PDF:", err);
        setError("Could not render PDF preview.");
        setLoading(false);
      }
    };
    renderPdf();
  }, [dataUrl]);

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6 text-center">
            <DocumentIcon className="w-12 h-12 mb-3 opacity-50 text-red-400" />
            <p className="text-sm mb-2 text-red-400/80">{error}</p>
        </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        )}
        <canvas ref={canvasRef} className={`max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`} />
    </div>
  );
};

export const LivePreview: React.FC<LivePreviewProps> = ({ creation, isLoading, isFocused, onReset, onAskQuestion, modelId }) => {
    const [loadingStep, setLoadingStep] = useState(0);
    const [showSplitView, setShowSplitView] = useState(false);
    const [isButtonDragging, setIsButtonDragging] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false); 
    
    const [isInspectMode, setIsInspectMode] = useState(false);
    const [inspectTarget, setInspectTarget] = useState<{x: number, y: number} | null>(null);
    
    // Auto Pilot State
    const [autoPilotPos, setAutoPilotPos] = useState<{x: number, y: number} | null>(null);

    // X-Ray / SVG Overlay State
    const [isXRayActive, setIsXRayActive] = useState(false);
    const [xRaySvg, setXRaySvg] = useState<string>("");
    const [isGeneratingXRay, setIsGeneratingXRay] = useState(false);

    // DATA CARDS STATE
    const [bioData, setBioData] = useState<BioData | null>(null);
    const [techData, setTechData] = useState<TechData | null>(null);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Loupe / Magnifier Refs
    const loupeContainerRef = useRef<HTMLDivElement>(null);
    const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoupeVisible, setIsLoupeVisible] = useState(false);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatExpanded, setIsChatExpanded] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<{
        role: 'user' | 'ai', 
        text: string, 
        type?: 'text' | 'patch' | 'scan' | 'nav',
        image?: string // Optional field to show the cropped image in chat
    }[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isPatching, setIsPatching] = useState(false); 
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [currentHtml, setCurrentHtml] = useState<string>("");
    
    // Store image natural dimensions for precision calculation
    const [imgDims, setImgDims] = useState<{width: number, height: number} | null>(null);

    useEffect(() => {
        if (creation) {
            setCurrentHtml(creation.html);
            // Pre-load image to get dimensions
            if (creation.originalImage && !creation.originalImage.startsWith('data:application/pdf')) {
                const img = new Image();
                img.onload = () => {
                    setImgDims({ width: img.naturalWidth, height: img.naturalHeight });
                };
                img.src = creation.originalImage;
            }
        }
    }, [creation]);

    useEffect(() => {
        if (isLoading) {
            setLoadingStep(0);
            const interval = setInterval(() => {
                setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
            }, 2000); 
            return () => clearInterval(interval);
        } else {
            setLoadingStep(0);
        }
    }, [isLoading]);

    useEffect(() => {
        if (creation?.originalImage) {
            setShowSplitView(false); 
        }
        setMessages([]);
        setIsChatOpen(false);
        setIsChatExpanded(false);
        setIsInspectMode(false);
        setInspectTarget(null);
        setIsPlaying(false);
        setIsPatching(false);
        setAutoPilotPos(null);
        setIsXRayActive(false);
        setXRaySvg("");
        setBioData(null);
        setTechData(null);
    }, [creation]);

    useEffect(() => {
        if(isChatExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isChatExpanded]);

    // ... (Keep existing calculateImageCoordinates, pctToScreen, updateLoupe, handleSmartToolMove, cropImage)
    const calculateImageCoordinates = (screenX: number, screenY: number): { xPct: number, yPct: number, valid: boolean } => {
        if (!previewContainerRef.current || !imgDims) {
            // Fallback if dimensions not loaded or container missing
            if(previewContainerRef.current) {
                const rect = previewContainerRef.current.getBoundingClientRect();
                 const xPct = Math.max(0, Math.min(100, Math.round(((screenX - rect.left) / rect.width) * 100)));
                 const yPct = Math.max(0, Math.min(100, Math.round(((screenY - rect.top) / rect.height) * 100)));
                 return { xPct, yPct, valid: true };
            }
            return { xPct: 0, yPct: 0, valid: false };
        }

        const container = previewContainerRef.current.getBoundingClientRect();
        
        // Calculate the actual displayed dimensions of the image within the container
        // (Assuming object-fit: contain behavior)
        const containerRatio = container.width / container.height;
        const imageRatio = imgDims.width / imgDims.height;

        let displayedWidth, displayedHeight, offsetX, offsetY;

        if (containerRatio > imageRatio) {
            // Container is wider than image (Image touches top/bottom, black bars on sides)
            displayedHeight = container.height;
            displayedWidth = displayedHeight * imageRatio;
            offsetY = 0;
            offsetX = (container.width - displayedWidth) / 2;
        } else {
            // Container is taller than image (Image touches sides, black bars on top/bottom)
            displayedWidth = container.width;
            displayedHeight = displayedWidth / imageRatio;
            offsetX = 0;
            offsetY = (container.height - displayedHeight) / 2;
        }

        // Relative Mouse Position inside Container
        const relMouseX = screenX - container.left;
        const relMouseY = screenY - container.top;

        // Check if click is inside the actual image area
        if (
            relMouseX < offsetX || 
            relMouseX > offsetX + displayedWidth ||
            relMouseY < offsetY ||
            relMouseY > offsetY + displayedHeight
        ) {
            return { xPct: 0, yPct: 0, valid: false }; // User clicked on the black bars
        }

        // Calculate Percentage relative to the IMAGE, not the container
        const xPct = Math.round(((relMouseX - offsetX) / displayedWidth) * 100);
        const yPct = Math.round(((relMouseY - offsetY) / displayedHeight) * 100);

        return { xPct, yPct, valid: true };
    };

    // Helper: Convert Percentage to Screen Pixels (for Auto-Pilot)
    const pctToScreen = (xPct: number, yPct: number) => {
        if (!previewContainerRef.current || !imgDims) return null;
        const container = previewContainerRef.current.getBoundingClientRect();
        const containerRatio = container.width / container.height;
        const imageRatio = imgDims.width / imgDims.height;

        let displayedWidth, displayedHeight, offsetX, offsetY;

        if (containerRatio > imageRatio) {
            displayedHeight = container.height;
            displayedWidth = displayedHeight * imageRatio;
            offsetY = 0;
            offsetX = (container.width - displayedWidth) / 2;
        } else {
            displayedWidth = container.width;
            displayedHeight = displayedWidth / imageRatio;
            offsetX = 0;
            offsetY = (container.height - displayedHeight) / 2;
        }

        const screenX = container.left + offsetX + (displayedWidth * (xPct / 100));
        const screenY = container.top + offsetY + (displayedHeight * (yPct / 100));

        // Adjust for Probe Body offset (To center the TIP on the target)
        // Probe Tip is at: BodyX + 28, BodyY + 80.
        // So BodyX = TargetX - 28, BodyY = TargetY - 80.
        return {
            x: screenX - 28,
            y: screenY - 80
        };
    };

    // --- REAL-TIME LOUPE LOGIC ---
    const updateLoupe = (xPct: number, yPct: number) => {
        if (!creation?.originalImage || !imgDims || !loupeCanvasRef.current) return;

        const ctx = loupeCanvasRef.current.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = creation.originalImage; // Note: In production with huge images, this might need optimizing, but browser cache handles it well usually.

        // Size of the source area we want to show (the zoom level)
        // We want to show a 200x200 pixel area from the source image on a 150x150 canvas
        const zoomFactor = 0.15; // Show 15% of image width
        const sourceW = Math.min(imgDims.width * zoomFactor, 400);
        const sourceH = Math.min(imgDims.height * zoomFactor, 400);

        const centerX = (xPct / 100) * imgDims.width;
        const centerY = (yPct / 100) * imgDims.height;

        const srcX = Math.max(0, Math.min(centerX - sourceW / 2, imgDims.width - sourceW));
        const srcY = Math.max(0, Math.min(centerY - sourceH / 2, imgDims.height - sourceH));

        // Clear and Draw
        loupeCanvasRef.current.width = 200;
        loupeCanvasRef.current.height = 200;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 200, 200);
        
        // Draw Image
        if (img.complete) {
             ctx.drawImage(img, srcX, srcY, sourceW, sourceH, 0, 0, 200, 200);
        } else {
            // Fallback if image isn't loaded yet (rare for dataURLs)
            img.onload = () => {
                ctx.drawImage(img, srcX, srcY, sourceW, sourceH, 0, 0, 200, 200);
            }
        }
        
        // Draw HUD overlay on canvas
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; // Blue 500
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Crosshair
        ctx.moveTo(100, 0); ctx.lineTo(100, 200);
        ctx.moveTo(0, 100); ctx.lineTo(200, 100);
        // Circle target
        ctx.moveTo(120, 100); ctx.arc(100, 100, 20, 0, Math.PI * 2);
        ctx.stroke();
    };

    const handleSmartToolMove = (screenX: number, screenY: number) => {
        if (isInspectMode) return;

        // 1. Calculate validity
        const coords = calculateImageCoordinates(screenX, screenY);

        if (!coords.valid) {
            setIsLoupeVisible(false);
            return;
        }

        // 2. Show Loupe
        setIsLoupeVisible(true);

        // 3. Move Loupe Container
        if (loupeContainerRef.current) {
            // Position it to the top-right of the probe to avoid blocking view
            // The probe tip is at screenX, screenY
            loupeContainerRef.current.style.transform = `translate(${screenX + 40}px, ${screenY - 120}px)`;
        }

        // 4. Update Canvas Content
        updateLoupe(coords.xPct, coords.yPct);
    };

    // --- NEW: Client-Side Cropping Function to eliminate Hallucination ---
    const cropImage = (xPct: number, yPct: number): string | null => {
        if (!creation?.originalImage || !imgDims) return null;
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = creation.originalImage;
            
            // Define Zoom Level (e.g., crop a 250x250 area from original resolution)
            const cropWidth = Math.min(imgDims.width * 0.2, 400); // Max 400px or 20% of width
            const cropHeight = Math.min(imgDims.height * 0.2, 400);
            
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            
            const centerX = (xPct / 100) * imgDims.width;
            const centerY = (yPct / 100) * imgDims.height;
            
            // Calculate top-left of crop, keeping it within bounds
            const srcX = Math.max(0, Math.min(centerX - cropWidth / 2, imgDims.width - cropWidth));
            const srcY = Math.max(0, Math.min(centerY - cropHeight / 2, imgDims.height - cropHeight));

            if (ctx) {
                ctx.drawImage(img, srcX, srcY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
                // Draw a crosshair on the cropped image to show exactly where the AI should look
                ctx.strokeStyle = '#ef4444'; // Red
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cropWidth / 2 - 10, cropHeight / 2);
                ctx.lineTo(cropWidth / 2 + 10, cropHeight / 2);
                ctx.moveTo(cropWidth / 2, cropHeight / 2 - 10);
                ctx.lineTo(cropWidth / 2, cropHeight / 2 + 10);
                ctx.stroke();

                return canvas.toDataURL('image/jpeg', 0.8);
            }
        } catch (e) {
            console.error("Cropping failed", e);
        }
        return null;
    };

    const handleProbeRelease = (screenX: number, screenY: number) => {
        setIsButtonDragging(false);
        setIsLoupeVisible(false); // Hide Loupe
        if (!previewContainerRef.current || !onAskQuestion) return;

        // Use the new precise calculator
        const coords = calculateImageCoordinates(screenX, screenY);

        if (!coords.valid) {
            setIsChatExpanded(true);
            setIsChatOpen(true);
            setMessages(prev => [...prev, { role: 'ai', text: "Scan failed: No signal. Please align crosshair over the image content, not the background.", type: 'scan' }]);
            return;
        }

        // Auto-trigger the question with precise coords
        handleScanQuery(coords.xPct, coords.yPct);
    };

    const handleScanQuery = async (xPct: number, yPct: number) => {
        if (!onAskQuestion) return;

        setIsChatExpanded(true);
        setIsChatOpen(true);
        setIsChatLoading(true);

        // Reset previous scan data cards
        setBioData(null);
        setTechData(null);

        // Perform the crop
        const croppedBase64 = cropImage(xPct, yPct);
        
        // Remove data header for API
        const cleanCrop = croppedBase64 ? croppedBase64.split(',')[1] : undefined;
        
        // Get Full Context Image
        let fullImageContext: string | undefined;
        if (creation?.originalImage) {
            fullImageContext = creation.originalImage.split(',')[1];
        }

        const scanMsg = `Scanning coordinates X:${xPct}% Y:${yPct}%...`;
        
        // Add message WITH the cropped thumbnail for UX
        setMessages(prev => [...prev, { 
            role: 'user', 
            text: scanMsg, 
            type: 'scan', 
            image: croppedBase64 || undefined
        }]);

        try {
            if (cleanCrop) {
                // 1. ATTEMPT BIO-ANALYSIS FIRST (Field Guide Logic)
                // Pass modelId to service
                const bioResult = await analyzeBiologicalEntity(cleanCrop, fullImageContext, modelId);
                
                if (bioResult.isBiological && bioResult.confidence > 50) {
                     setBioData(bioResult);
                     setMessages(prev => [...prev, { role: 'ai', text: `Bio-Signature Detected: ${bioResult.commonName}. Confidence: ${bioResult.confidence}%. Accessing field guide...`, type: 'scan' }]);
                     setIsChatLoading(false);
                     return;
                }

                // 2. IF NOT BIO, ATTEMPT TECHNICAL ANALYSIS (Tech-Scanner)
                // Pass modelId to service
                const techResult = await analyzeTechnicalComponent(cleanCrop, fullImageContext, modelId);

                if (techResult.isTechnical) {
                    setTechData(techResult);
                    setMessages(prev => [...prev, { role: 'ai', text: `Mechanical Structure Identified: ${techResult.componentName}. Confidence: ${techResult.confidence || 0}%. Loading schematics...`, type: 'scan' }]);
                    setIsChatLoading(false);
                    return;
                }
            }

            // Fallback to standard generic response if both specific scanners fail
            const prompt = `[MICRO-ANALYSIS REQUEST] 
            I have sent you two images.
            1. The Context Image (Full view).
            2. The TARGET CROP (Zoomed in view).
            
            YOUR TASK: Ignore the surrounding area. Focus EXCLUSIVELY on the center of the TARGET CROP image.
            Identify the specific component (Diode, Resistor, Chip, Organelle, Engine Part) shown in the crosshair of the zoomed image.
            Read any text labels visible in the crop.`;

            const response = await onAskQuestion(prompt, cleanCrop);
            setMessages(prev => [...prev, { role: 'ai', text: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: "Scan failed. Signal lost." }]);
        } finally {
            setIsChatLoading(false);
        }
    };
    
    // NEW: Handle Full Image Analysis (Global Scan)
    const handleGlobalScan = async () => {
        if (!creation?.originalImage) return;

        setIsChatExpanded(true);
        setIsChatOpen(true);
        setIsChatLoading(true);
        
        const fullBase64 = creation.originalImage.split(',')[1];
        
        setMessages(prev => [...prev, { 
            role: 'user', 
            text: "Initiating GLOBAL SCAN of entire visual sector...", 
            type: 'scan' 
        }]);

        try {
            // Pass modelId
            const bioResult = await analyzeBiologicalEntity(fullBase64, undefined, modelId);
            
            if (bioResult.isBiological) {
                 setBioData(bioResult);
                 setMessages(prev => [...prev, { role: 'ai', text: `Primary Subject Identified: ${bioResult.commonName}. Confidence: ${bioResult.confidence}%.`, type: 'scan' }]);
            } else {
                 setMessages(prev => [...prev, { role: 'ai', text: "Global scan complete. No specific biological entity identified as primary subject.", type: 'scan' }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: "Global scan failed." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const toggleSimulation = () => {
        const newState = !isPlaying;
        setIsPlaying(newState);
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'toggleSimulation',
                isPlaying: newState
            }, '*');
        }
    };

    const toggleXRay = async () => {
        if (!creation?.originalImage) return;

        if (isXRayActive) {
            setIsXRayActive(false);
            return;
        }

        // Turn on
        setIsXRayActive(true);

        // If no SVG yet, generate it
        if (!xRaySvg && !isGeneratingXRay) {
             setIsGeneratingXRay(true);
             const base64 = creation.originalImage.split(',')[1];
             const mime = creation.originalImage.split(';')[0].split(':')[1];
             // Pass modelId
             const svg = await generateSchematicOverlay(base64, mime, modelId);
             setXRaySvg(svg);
             setIsGeneratingXRay(false);
        }
    };

    const handleExport = () => {
        if (!creation) return;
        const exportData = { ...creation, html: currentHtml };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${creation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_artifact.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleInspectClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isInspectMode || !previewContainerRef.current) return;
        
        const coords = calculateImageCoordinates(e.clientX, e.clientY);
        
        if(coords.valid) {
            const rect = previewContainerRef.current.getBoundingClientRect();
            // Just for the visual marker, we use the click coords relative to container
            setInspectTarget({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            handleScanQuery(coords.xPct, coords.yPct);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !onAskQuestion) return;

        const userMsg = chatInput;
        setChatInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsChatLoading(true);

        // 1. AUTO-PILOT DETECTION (Locate/Find/Cari/Mana)
        const isFindRequest = /find|locate|search|where is|cari|mana|detect/i.test(userMsg);
        
        if (isFindRequest && creation?.originalImage) {
            setMessages(prev => [...prev, { role: 'ai', text: "Scanning visual matrix...", type: 'nav' }]);
            const base64 = creation.originalImage.split(',')[1];
            const mime = creation.originalImage.split(';')[0].split(':')[1];
            
            // Pass modelId
            const result = await locateObject(userMsg, base64, mime, modelId);
            
            if (result.found) {
                const screenPos = pctToScreen(result.x, result.y);
                if (screenPos) {
                    setMessages(prev => [...prev, { role: 'ai', text: `Target Acquired: ${result.label}. Initiating auto-navigation.`, type: 'nav' }]);
                    setAutoPilotPos(screenPos); // Triggers SmartFloatingButton movement
                } else {
                     setMessages(prev => [...prev, { role: 'ai', text: "Target found, but off-screen coordinates." }]);
                }
            } else {
                 setMessages(prev => [...prev, { role: 'ai', text: "Negative contact. Object not found in visual sector." }]);
            }
            setIsChatLoading(false);
            return;
        }

        // 2. PATCHING DETECTION
        const isModificationRequest = /fix|change|broken|doesn't work|add|remove|modify|adjust|salah|rosak|tak boleh/i.test(userMsg);

        if (isModificationRequest) {
            try {
                setMessages(prev => [...prev, { role: 'ai', text: "Analyzing code logic for repairs...", type: 'text' }]);
                setIsPatching(true);
                // Pass modelId
                const patchedHtml = await refineSimulation(currentHtml, userMsg, modelId);
                setCurrentHtml(patchedHtml);
                setMessages(prev => [...prev, { role: 'ai', text: "System patched. Logic updated.", type: 'patch' }]);
            } catch (error) {
                setMessages(prev => [...prev, { role: 'ai', text: "Failed to apply patch. Please try again." }]);
            } finally {
                setIsPatching(false);
                setIsChatLoading(false);
            }
        } else {
            // 3. GENERAL QA
            try {
                const response = await onAskQuestion(userMsg);
                setMessages(prev => [...prev, { role: 'ai', text: response }]);
            } catch (error) {
                setMessages(prev => [...prev, { role: 'ai', text: "Connection interrupted." }]);
            } finally {
                setIsChatLoading(false);
            }
        }
    };

    const toggleChat = () => {
        setIsChatExpanded(!isChatExpanded);
        if (!isChatExpanded) setIsChatOpen(true);
    };

    const toggleInspectMode = () => {
        setIsInspectMode(!isInspectMode);
        setInspectTarget(null);
    };

  return (
    <div
      className={`
        fixed z-40 flex flex-col
        rounded-lg overflow-hidden border border-zinc-800 bg-[#0E0E10] shadow-2xl
        transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)
        ${isFocused
          ? 'inset-2 md:inset-4 opacity-100 scale-100'
          : 'top-1/2 left-1/2 w-[90%] h-[60%] -translate-x-1/2 -translate-y-1/2 opacity-0 scale-95 pointer-events-none'
        }
      `}
    >
      {/* Floating Smart Probe - Draggable Scanner & Auto-Pilot */}
      {!isLoading && creation && !isInspectMode && (
        <SmartFloatingButton 
            onDragStart={() => {
                setIsButtonDragging(true);
                setAutoPilotPos(null); // Cancel auto-pilot on manual interaction
            }} 
            onDragEnd={handleProbeRelease}
            onMove={handleSmartToolMove}
            isScanning={isChatLoading && messages[messages.length-1]?.type === 'scan'}
            moveTo={autoPilotPos} // Pass the auto-pilot target
        />
      )}

      {/* TACTICAL LOUPE - Real-time Magnifying Glass */}
      <div 
        ref={loupeContainerRef}
        className={`fixed z-[10001] pointer-events-none transition-opacity duration-200 ${isLoupeVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ top: 0, left: 0 }}
      >
         <div className="relative">
             {/* The Glass */}
             <div className="w-40 h-40 rounded-full border-2 border-blue-400 bg-black overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.5)] backdrop-blur-0">
                 <canvas ref={loupeCanvasRef} className="w-full h-full object-cover" />
                 
                 {/* Digital Overlays */}
                 <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
                 <div className="absolute inset-0 rounded-full border border-white/20"></div>
                 
                 {/* Scanning Line Animation */}
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/20 to-transparent w-full h-2 animate-[scan_1s_infinite]"></div>
             </div>

             {/* Connection Line to Probe */}
             <div className="absolute top-20 -left-10 w-10 h-[1px] bg-blue-500/50"></div>
             <div className="absolute top-20 -left-10 w-1 h-1 bg-blue-500 rounded-full"></div>

             {/* Tech Label */}
             <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-900/80 text-blue-200 text-[9px] font-mono px-2 py-0.5 rounded border border-blue-500/50 whitespace-nowrap">
                LIVE FEED [200%]
             </div>
         </div>
      </div>

      {/* Header */}
      <div className="bg-[#121214] px-4 py-3 flex items-center justify-between border-b border-zinc-800 shrink-0">
        <div className="flex items-center space-x-3 w-32">
           <div className="flex space-x-2 group/controls">
                <button 
                  onClick={onReset}
                  className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-red-500 hover:!bg-red-600 transition-colors flex items-center justify-center focus:outline-none"
                  title="Close Preview"
                >
                  <XMarkIcon className="w-2 h-2 text-black opacity-0 group-hover/controls:opacity-100" />
                </button>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-yellow-500 transition-colors"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-green-500 transition-colors"></div>
           </div>
        </div>
        
        <div className="flex items-center space-x-2 text-zinc-500">
            <CodeBracketIcon className="w-3 h-3" />
            <span className="text-[11px] font-mono uppercase tracking-wider">
                {isLoading ? 'System Processing...' : creation ? creation.name : 'Interactive Simulation'}
            </span>
        </div>

        <div className="flex items-center justify-end space-x-1 w-fit">
            {!isLoading && creation && (
                <>  
                     {/* Play / Pause Simulation */}
                     <button 
                        onClick={toggleSimulation}
                        title={isPlaying ? "Stop Simulation" : "Start Active Simulation"}
                        className={`p-1.5 rounded-md transition-all flex items-center gap-2 mr-2 border ${
                            isPlaying 
                            ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white hover:border-zinc-500'
                        }`}
                    >
                        {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                        <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">
                            {isPlaying ? 'Running' : 'Simulate'}
                        </span>
                    </button>

                     {/* X-Ray Mode Toggle */}
                     <button 
                        onClick={toggleXRay}
                        title="Toggle X-Ray Schematic Layer"
                        className={`p-1.5 rounded-md transition-all flex items-center gap-2 mr-2 border ${
                            isXRayActive 
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' 
                            : 'text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 border-transparent'
                        }`}
                    >
                        <EyeIcon className="w-4 h-4" />
                        {isXRayActive && <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">X-RAY</span>}
                    </button>

                    {/* NEW: Global Scan Button */}
                    <button 
                        onClick={handleGlobalScan}
                        title="Identify Subject (Global Scan)"
                        className="p-1.5 rounded-md transition-all flex items-center gap-2 mr-2 text-zinc-500 hover:text-purple-400 hover:bg-zinc-800 border-transparent"
                    >
                        <PhotoIcon className="w-4 h-4" />
                    </button>

                    {/* Manual Scan Mode */}
                    <button 
                        onClick={toggleInspectMode}
                        title={isInspectMode ? "Cancel Manual Scan" : "Click-to-Scan Mode"}
                        className={`p-1.5 rounded-md transition-all flex items-center gap-2 mr-2 ${
                            isInspectMode 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                            : 'text-zinc-500 hover:text-blue-400 hover:bg-zinc-800'
                        }`}
                    >
                        <ViewfinderCircleIcon className="w-4 h-4" />
                        {isInspectMode && <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">Scan</span>}
                    </button>

                    {creation.originalImage && (
                         <button 
                            onClick={() => setShowSplitView(!showSplitView)}
                            title={showSplitView ? "Show Simulation Only" : "Compare with Original"}
                            className={`p-1.5 rounded-md transition-all ${showSplitView ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            <ViewColumnsIcon className="w-4 h-4" />
                        </button>
                    )}

                    <button 
                        onClick={handleExport}
                        title="Export JSON"
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>

                    <button 
                        onClick={onReset}
                        title="Close"
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                    >
                        <PlusIcon className="w-4 h-4 rotate-45" />
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex bg-[#09090b] overflow-hidden" ref={previewContainerRef}>
        
        {/* Loading Overlay */}
        {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b]">
                 <div className="w-80 space-y-8">
                    <div className="space-y-4">
                        <LoadingStep text="Analyzing Visual Structure" active={loadingStep === 0} completed={loadingStep > 0} />
                        <LoadingStep text="Detecting Components & Paths" active={loadingStep === 1} completed={loadingStep > 1} />
                        <LoadingStep text="Compiling Interactive Simulation" active={loadingStep === 2} completed={loadingStep > 2} />
                        <LoadingStep text="Finalizing Physics Engine" active={loadingStep === 3} completed={loadingStep > 3} />
                    </div>
                 </div>
            </div>
        )}

        {/* Patching Overlay */}
        {isPatching && (
             <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none animate-in fade-in duration-300">
                <div className="bg-zinc-900 border border-blue-500/50 p-4 rounded-lg shadow-2xl flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-400 font-mono text-sm tracking-wider">APPLYING LOGIC PATCH...</span>
                </div>
             </div>
        )}

        {creation && !isLoading && (
             <div className="w-full h-full flex relative">
                 
                 {/* BIO-DATA CARD OVERLAY */}
                 {bioData && <BioDataCard data={bioData} onClose={() => setBioData(null)} />}

                 {/* TECH-DATA CARD OVERLAY (NEW) */}
                 {techData && <TechDataCard data={techData} onClose={() => setTechData(null)} />}

                 {/* X-RAY LAYER (SVG OVERLAY) */}
                 {isXRayActive && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden flex items-center justify-center">
                        {isGeneratingXRay ? (
                            <div className="flex items-center space-x-2 bg-black/80 px-4 py-2 rounded-full border border-cyan-500/50 animate-pulse">
                                <SparklesIcon className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs text-cyan-400 font-mono">GENERATING SCHEMATICS...</span>
                            </div>
                        ) : xRaySvg ? (
                            // Render the SVG overlaid on the image/simulation
                            // We use object-fit logic similar to the image to ensure alignment
                            // For simplicity in this iteration, we assume 'contain' sizing matches the simulation iframe
                            <div className="relative w-full h-full">
                                <svg 
                                    viewBox="0 0 100 100" 
                                    preserveAspectRatio="none"
                                    className="w-full h-full opacity-80"
                                    dangerouslySetInnerHTML={{ __html: xRaySvg }}
                                />
                                {/* Grid texture overlay */}
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                                <div className="absolute inset-0 border-2 border-cyan-500/30"></div>
                            </div>
                        ) : null}
                    </div>
                 )}

                 {/* Manual Inspection Overlay */}
                 {isInspectMode && (
                    <div 
                        className="absolute inset-0 z-30 cursor-crosshair"
                        onClick={handleInspectClick}
                    >
                        {inspectTarget && (
                            <div 
                                className="absolute pointer-events-none"
                                style={{ left: inspectTarget.x, top: inspectTarget.y }}
                            >
                                <div className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-red-500 rounded-full animate-ping opacity-75"></div>
                                <div className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-red-500/50 rounded-full blur-[2px]"></div>
                                <div className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-[1px] bg-red-500"></div>
                                <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[1px] h-12 bg-red-500"></div>
                            </div>
                        )}
                    </div>
                 )}

                 {/* Original View */}
                 {showSplitView && creation.originalImage && (
                    <div className="w-1/2 h-full border-r border-zinc-800 bg-[#0c0c0e] relative flex items-center justify-center p-8">
                        <div className="absolute top-4 left-4 text-xs font-mono text-zinc-500 uppercase tracking-wider bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800">
                            Reference Source
                        </div>
                        {creation.originalImage.startsWith('data:application/pdf') ? (
                            <PdfRenderer dataUrl={creation.originalImage} />
                        ) : (
                            <img src={creation.originalImage} className="max-w-full max-h-full object-contain opacity-80" />
                        )}
                    </div>
                 )}

                 {/* Interactive Simulation View */}
                 <div className={`relative h-full ${showSplitView ? 'w-1/2' : 'w-full'} bg-[#0E0E10]`}>
                    <iframe
                        ref={iframeRef}
                        srcDoc={currentHtml}
                        title="Interactive Preview"
                        className={`w-full h-full border-none bg-transparent transition-opacity ${isInspectMode ? 'opacity-50 grayscale-[0.5]' : 'opacity-100'} ${isButtonDragging ? 'pointer-events-none' : ''}`}
                        sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                        allowTransparency={true}
                    />
                 </div>
             </div>
        )}

        {/* Floating Terminal/Chat Interface */}
        {!isLoading && creation && onAskQuestion && (
            <div className={`absolute bottom-6 left-6 z-50 flex flex-col items-start transition-all duration-500 ${isChatExpanded ? 'w-96' : 'w-auto'}`}>
                
                {/* Terminal Window */}
                <div className={`
                    mb-3 w-full bg-[#0a0a0c]/95 backdrop-blur-md border border-zinc-800 rounded-lg overflow-hidden shadow-2xl flex flex-col transition-all duration-500 origin-bottom-left
                    ${isChatExpanded ? 'h-96 opacity-100 scale-100' : 'h-0 opacity-0 scale-90 pointer-events-none'}
                `}>
                    {/* Terminal Header */}
                    <div className="p-2 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                             <CommandLineIcon className="w-4 h-4 text-zinc-400" />
                             <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">System Console</span>
                        </div>
                        <button onClick={toggleChat} className="text-zinc-600 hover:text-zinc-300">
                            <ChevronDownIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                        {messages.length === 0 && (
                            <div className="text-zinc-600 text-[11px] space-y-2">
                                <p>{">"} System Initialized.</p>
                                <p>{">"} Current Engine: <span className="text-blue-400">{modelId}</span></p>
                                <p>{">"} Drag the Smart Probe to any component to analyze it.</p>
                                <p>{">"} Type "Find [component]" to auto-navigate.</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] rounded px-3 py-2 text-[11px] leading-relaxed border ${
                                    msg.role === 'user' 
                                        ? msg.type === 'scan' 
                                            ? 'bg-blue-900/20 text-blue-300 border-blue-500/30'
                                            : 'bg-zinc-800/50 text-blue-200 border-zinc-700' 
                                    : msg.type === 'patch'
                                        ? 'bg-green-900/20 text-green-400 border-green-900/50'
                                        : msg.type === 'nav'
                                            ? 'bg-amber-900/20 text-amber-400 border-amber-900/50'
                                            : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                                }`}>
                                    {msg.type === 'patch' && <WrenchScrewdriverIcon className="w-3 h-3 inline mr-2" />}
                                    {msg.type === 'scan' && <ViewfinderCircleIcon className="w-3 h-3 inline mr-2 animate-pulse" />}
                                    {msg.type === 'nav' && <BoltIcon className="w-3 h-3 inline mr-2 animate-bounce" />}
                                    
                                    {/* Show Cropped Image Thumbnail if available */}
                                    {msg.image && (
                                        <div className="mb-2 rounded overflow-hidden border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)] w-24 h-24 bg-black">
                                            <img src={msg.image} className="w-full h-full object-contain" alt="Scan Target" />
                                        </div>
                                    )}
                                    
                                    <span className="whitespace-pre-wrap">{msg.text}</span>
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                             <div className="text-[11px] text-zinc-500 animate-pulse">{">"} Processing data stream...</div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Line */}
                    <form onSubmit={handleSendMessage} className="p-2 border-t border-zinc-800 bg-zinc-900 flex items-center">
                        <span className="text-blue-500 mr-2 text-sm">{">"}</span>
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Enter command or 'find [obj]'..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-xs text-zinc-200 font-mono placeholder-zinc-700"
                            autoFocus={!!inspectTarget}
                        />
                    </form>
                </div>

                {/* Toggle Button */}
                <button 
                    onClick={toggleChat}
                    className={`
                        flex items-center space-x-2 px-4 py-2 rounded border transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]
                        ${isChatExpanded 
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-400' 
                            : 'bg-[#0a0a0c] border-blue-900/30 text-blue-400 hover:border-blue-500/50'
                        }
                    `}
                >
                    {isChatExpanded ? (
                         <span className="text-xs font-mono">_MINIMIZE</span>
                    ) : (
                        <>
                            <CommandLineIcon className="w-4 h-4" />
                            <span className="text-xs font-mono font-bold tracking-wider">CONSOLE</span>
                        </>
                    )}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};