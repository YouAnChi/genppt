import React, { useState, useEffect } from 'react';
import { Presentation } from '../types';
import SlideRenderer from './SlideRenderer';
import { ChevronLeft, ChevronRight, Maximize2, Download, Share2, Edit3, Grid, Play, Loader2 } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';

interface PresentationPanelProps {
  presentation: Presentation | null;
  isGenerating: boolean;
}

const PresentationPanel: React.FC<PresentationPanelProps> = ({ presentation, isGenerating }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Reset index when presentation title changes (new presentation)
  useEffect(() => {
    if (presentation) {
        setCurrentSlideIndex(0);
    }
  }, [presentation?.title]);

  if (!presentation && isGenerating) {
    return (
      <div className="flex-1 h-full bg-gray-100 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-3xl aspect-video bg-white rounded-xl shadow-sm animate-pulse flex items-center justify-center border border-gray-200">
            <div className="flex flex-col items-center gap-4 text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 animate-bounce"></div>
                <p>Designing your slides...</p>
            </div>
        </div>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="flex-1 h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
         <div className="bg-white p-12 rounded-2xl shadow-sm text-center">
            <Grid className="w-16 h-16 mx-auto mb-4 text-gray-200" />
            <h2 className="text-xl font-semibold text-gray-600">No Presentation Yet</h2>
            <p className="mt-2 text-sm">Start a chat to generate a presentation.</p>
         </div>
      </div>
    );
  }

  // Handle case where presentation exists (shell) but no slides have streamed in yet
  if (presentation.slides.length === 0) {
      return (
        <div className="flex-1 h-full bg-gray-100 flex flex-col overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
                <h2 className="font-semibold text-gray-800">{presentation.title}</h2>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Preparing...</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-3xl aspect-video bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-gray-200 gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-700">Writing first slide...</h3>
                        <p className="text-gray-400 text-sm mt-1">Applying visual theme: {presentation.topic}</p>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // Safe index handling
  const safeIndex = Math.min(currentSlideIndex, Math.max(0, presentation.slides.length - 1));
  const currentSlide = presentation.slides[safeIndex];
  const totalSlides = presentation.slides.length;

  const handleNext = () => {
    if (safeIndex < totalSlides - 1) setCurrentSlideIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (safeIndex > 0) setCurrentSlideIndex(prev => prev - 1);
  };

  const handleExport = async () => {
    if (!presentation || isExporting) return;
    
    setIsExporting(true);
    try {
        const zip = new JSZip();
        // Sanitize title for filename
        const safeTitle = presentation.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
        const rootFolder = zip.folder(safeTitle);
        
        if (!rootFolder) throw new Error("Could not create zip folder");

        // Generate HTML for each slide
        presentation.slides.forEach((slide, index) => {
            const slideMarkup = renderToStaticMarkup(
                <SlideRenderer slide={slide} scale={1} />
            );
            
            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${slide.title} - Slide ${index + 1}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body { 
        margin: 0; 
        padding: 0; 
        background-color: #111827; /* Dark background for presentation mode feeling */
        min-height: 100vh; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
        font-family: 'Inter', sans-serif;
      }
      .slide-viewport {
        width: 1280px; 
        height: 720px; 
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
        overflow: hidden;
        background: white;
      }
    </style>
</head>
<body>
    <div class="slide-viewport">
        ${slideMarkup}
    </div>
</body>
</html>`;
            
            rootFolder.file(`slide_${String(index + 1).padStart(2, '0')}.html`, htmlContent);
        });

        // Add a simple index.html to link them all together
        const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${presentation.title} - Index</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-gray-50 min-h-screen p-10 font-sans">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">${presentation.title}</h1>
        <p class="text-gray-500 mb-8">Generated by GenSpark Agent</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${presentation.slides.map((s, i) => `
            <a href="slide_${String(i + 1).padStart(2, '0')}.html" class="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all group">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Slide ${i + 1}</span>
                    <span class="w-2 h-2 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                </div>
                <h2 class="text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">${s.title}</h2>
                <p class="text-sm text-gray-500 mt-1 truncate">${s.subtitle || 'No subtitle'}</p>
            </a>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
        rootFolder.file('index.html', indexHtml);

        // Generate zip
        const content = await zip.generateAsync({ type: "blob" });
        
        // Download
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeTitle}_presentation.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Export failed", e);
        alert("Failed to export presentation.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 h-full bg-gray-100 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="font-semibold text-gray-800 truncate max-w-md" title={presentation.title}>
                {presentation.title}
            </h2>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                {totalSlides} Slides
            </span>
        </div>
        
        <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors" title="Edit Mode">
                <Edit3 size={18} />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded-lg text-gray-600 text-sm font-medium transition-colors border border-transparent hover:border-gray-200">
                <Share2 size={16} />
                Share
            </button>
            <button 
                onClick={handleExport}
                disabled={isExporting}
                className={`flex items-center gap-2 px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
            >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isExporting ? 'Exporting...' : 'Export HTML'}
            </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-gray-100/50">
         
         {/* Slide Container with auto-fit logic */}
         <div className="relative shadow-2xl rounded-lg overflow-hidden border border-gray-200 bg-white" 
              style={{ width: 'min(90%, 1280px)', aspectRatio: '16/9' }}>
            
            {/* The Scaled Slide */}
            <div className="w-full h-full relative">
                 {/* Safeguard: Only render if slide exists */}
                 {currentSlide && <SlideWrapper slide={currentSlide} />}
            </div>

            {/* Hover Controls */}
            <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                 <button 
                    onClick={handlePrev} 
                    disabled={safeIndex === 0}
                    className="p-3 rounded-full bg-black/10 hover:bg-black/20 text-white backdrop-blur-sm transition-all disabled:opacity-0 pointer-events-auto"
                 >
                    <ChevronLeft size={32} />
                 </button>
                 <button 
                    onClick={handleNext} 
                    disabled={safeIndex === totalSlides - 1}
                    className="p-3 rounded-full bg-black/10 hover:bg-black/20 text-white backdrop-blur-sm transition-all disabled:opacity-0 pointer-events-auto"
                 >
                    <ChevronRight size={32} />
                 </button>
            </div>
         </div>
      </div>

      {/* Bottom Navigation Strip */}
      <div className="h-48 bg-white border-t border-gray-200 p-4 overflow-x-auto">
          <div className="flex gap-4 h-full items-center px-4 min-w-max">
             {presentation.slides.map((slide, idx) => (
                 <button 
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`relative group h-32 aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                        idx === safeIndex 
                        ? 'border-indigo-600 ring-2 ring-indigo-100 ring-offset-2 scale-105 shadow-md' 
                        : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                    }`}
                 >
                    {/* Thumbnail Preview - simplified by scaling down significantly */}
                    <div className="origin-top-left transform scale-[0.2]" style={{ width: '1280px', height: '720px' }}>
                        <SlideRenderer slide={slide} />
                    </div>
                    
                    <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 rounded">
                        {idx + 1}
                    </div>
                 </button>
             ))}
             
             {/* Add Slide Button */}
             <button className="h-32 aspect-[3/4] rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-600 transition-all">
                <div className="p-2 rounded-full bg-gray-100 group-hover:bg-white">
                    <Grid size={20} />
                </div>
                <span className="text-xs font-medium">Add Slide</span>
             </button>
          </div>
      </div>
    </div>
  );
};

// Wrapper to handle responsiveness of the slide content
const SlideWrapper: React.FC<{ slide: any }> = ({ slide }) => {
    
    const [scale, setScale] = useState(1);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { width } = containerRef.current.getBoundingClientRect();
                setScale(width / 1280);
            }
        };
        
        // Initial
        updateScale();
        
        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full bg-white relative">
            <SlideRenderer slide={slide} scale={scale} />
        </div>
    );
}

export default PresentationPanel;