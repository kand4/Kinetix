/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownTrayIcon, PlusIcon, ViewColumnsIcon, DocumentIcon, CodeBracketIcon, XMarkIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, ViewfinderCircleIcon, ChevronDownIcon, SparklesIcon, PlayIcon, PauseIcon, WrenchScrewdriverIcon, CommandLineIcon, BoltIcon } from '@heroicons/react/24/outline';
import { Creation } from './CreationHistory';
import { refineSimulation } from '../services/gemini'; // Import the new service

interface LivePreviewProps {
  creation: Creation | null;
  isLoading: boolean;
  isFocused: boolean;
  onReset: () => void;
  onAskQuestion?: (question: string, croppedBase64?: string) => Promise<string>;
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

// Smart Button with PRECISION CROSSHAIR
const SmartFloatingButton = ({ 
    onDragStart, 
    onDragEnd,
    onMove,
    isScanning
}: { 
    onDragStart: () => void, 
    onDragEnd: (x: number, y: number) => void,
    onMove: (x: number, y: number) => void,
    isScanning: boolean
}) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 100, y: 150 });
    const [isDragging, setIsDragging] = useState(false);
    
    // Offset now tracks the mouse relative to the PROBE BODY Top-Left
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        onDragStart();
        // Calculate offset so the mouse stays exactly where it grabbed relative to the button
        setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        onDragStart();
        const touch = e.touches[0];
        setDragOffset({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                setPosition({ x: newX, y: newY });
                onMove(e.clientX, e.clientY);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging) {
                const touch = e.touches[0];
                const newX = touch.clientX - dragOffset.x;
                const newY = touch.clientY - dragOffset.y;
                setPosition({ x: newX, y: newY });
                onMove(touch.clientX, touch.clientY);
            }
        };

        const handleEnd = (e: MouseEvent | TouchEvent) => {
            if (isDragging) {
                setIsDragging(false);
                
                // --- GEOMETRY CALIBRATION ---
                // Probe Body Width: 56px (w-14). Center X = 28px.
                // Probe Body Height: 56px (w-14).
                // Stem Height: 16px (h-4).
                // Target Box: 16px (h-4). Center is at 8px.
                // Total Y Offset = 56 (Body) + 16 (Stem) + 8 (Half Box) = 80px.
                
                const tipX = position.x + 28; 
                const tipY = position.y + 80; 
                
                onDragEnd(tipX, tipY);
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
                transform: isDragging ? 'scale(1.0)' : 'scale(1)',
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            {/* 
               CRITICAL FIX: Enforce fixed width (w-14 = 56px) on the container.
               This ensures 'items-center' calculates the exact center pixel (28px).
            */}
            <div className="relative w-14 flex flex-col items-center">
                
                {/* Visual Rings - Use Absolute Centering to prevent layout shifts */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 bg-blue-500/20 rounded-full pointer-events-none ${isDragging || isScanning ? 'animate-ping' : ''}`}></div>
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
                {/* Visual alignment matches the math: Body(56) -> Stem(16) -> Box(16, center 8) */}
                <div className={`flex flex-col items-center transition-all duration-200 z-10 ${isDragging ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    
                    {/* Connection Stem (Height 16px / h-4) */}
                    <div className="w-0.5 h-4 bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                    
                    {/* Crosshair Target (Height 16px / h-4) */}
                    <div className="relative w-4 h-4 flex items-center justify-center">
                        {/* Box Frame */}
                        <div className="absolute inset-0 border border-blue-500/80 rounded-sm bg-blue-500/10"></div>
                        
                        {/* Crosshairs */}
                        <div className="w-px h-full bg-blue-500/60"></div>
                        <div className="h-px w-full bg-blue-500/60 absolute"></div>
                        
                        {/* Laser Point - RED for visibility and accuracy */}
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
                    ${isDragging || isScanning ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0'}
                `}>
                    {isScanning ? 'ANALYZING SIGNAL...' : isDragging ? 'ALIGN RED DOT' : 'Smart Probe Ready'}
                </div>
            </div>
        </div>,
        document.body
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

export const LivePreview: React.FC<LivePreviewProps> = ({ creation, isLoading, isFocused, onReset, onAskQuestion }) => {
    const [loadingStep, setLoadingStep] = useState(0);
    const [showSplitView, setShowSplitView] = useState(false);
    const [isButtonDragging, setIsButtonDragging] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false); 
    
    const [isInspectMode, setIsInspectMode] = useState(false);
    const [inspectTarget, setInspectTarget] = useState<{x: number, y: number} | null>(null);
    
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatExpanded, setIsChatExpanded] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<{
        role: 'user' | 'ai', 
        text: string, 
        type?: 'text' | 'patch' | 'scan',
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
    }, [creation]);

    useEffect(() => {
        if(isChatExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isChatExpanded]);

    const handleSmartToolMove = (screenX: number, screenY: number) => {
        if (isInspectMode) return;
    };

    // --- KEY FIX: Calculate Correct Coordinates respecting object-fit: contain ---
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

        // Perform the crop
        const croppedBase64 = cropImage(xPct, yPct);
        
        // Remove data header for API
        const cleanCrop = croppedBase64 ? croppedBase64.split(',')[1] : undefined;

        const scanMsg = `Scanning coordinates X:${xPct}% Y:${yPct}%...`;
        
        // Add message WITH the cropped thumbnail for UX
        setMessages(prev => [...prev, { 
            role: 'user', 
            text: scanMsg, 
            type: 'scan', 
            image: croppedBase64 || undefined
        }]);

        try {
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

        const isModificationRequest = /fix|change|broken|doesn't work|add|remove|modify|adjust|salah|rosak|tak boleh/i.test(userMsg);

        if (isModificationRequest) {
            try {
                setMessages(prev => [...prev, { role: 'ai', text: "Analyzing code logic for repairs...", type: 'text' }]);
                setIsPatching(true);
                const patchedHtml = await refineSimulation(currentHtml, userMsg);
                setCurrentHtml(patchedHtml);
                setMessages(prev => [...prev, { role: 'ai', text: "System patched. Logic updated.", type: 'patch' }]);
            } catch (error) {
                setMessages(prev => [...prev, { role: 'ai', text: "Failed to apply patch. Please try again." }]);
            } finally {
                setIsPatching(false);
                setIsChatLoading(false);
            }
        } else {
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
      {/* Floating Smart Probe - Draggable Scanner */}
      {!isLoading && creation && !isInspectMode && (
        <SmartFloatingButton 
            onDragStart={() => setIsButtonDragging(true)} 
            onDragEnd={handleProbeRelease}
            onMove={handleSmartToolMove}
            isScanning={isChatLoading && messages[messages.length-1]?.type === 'scan'}
        />
      )}

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
                                <p>{">"} Drag the Smart Probe to any component to analyze it.</p>
                                <p>{">"} Type commands to modify logic (e.g., "Fan is too slow").</p>
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
                                        : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                                }`}>
                                    {msg.type === 'patch' && <WrenchScrewdriverIcon className="w-3 h-3 inline mr-2" />}
                                    {msg.type === 'scan' && <ViewfinderCircleIcon className="w-3 h-3 inline mr-2 animate-pulse" />}
                                    
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
                            placeholder="Enter command..."
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