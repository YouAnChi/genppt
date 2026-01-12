import React from 'react';
import { SlideData } from '../types';

interface SlideRendererProps {
  slide: SlideData;
  scale?: number;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({ slide, scale = 1 }) => {
  // Safety check: if slide is undefined/null (e.g. during streaming or error), return null
  if (!slide) {
      return null;
  }

  const { htmlContent, imageUrl } = slide;

  // Process HTML to inject the actual image URL if it exists
  // The agent puts src="__SLIDE_IMAGE__" in the HTML string.
  // We handle this replacement here (or in the parent) to ensure the latest image is shown.
  // We also make sure the container styling is reset or controlled by the wrapper.
  
  let processedHtml = htmlContent;
  
  if (imageUrl) {
    processedHtml = processedHtml.replace(/__SLIDE_IMAGE__/g, imageUrl);
    // Fallback for older prompts or if agent forgot placeholder but we have an image
    // (This is tricky with custom HTML, so we rely on the placeholder mostly)
  } else {
    // If no image yet, use a placeholder or empty
    processedHtml = processedHtml.replace(/__SLIDE_IMAGE__/g, 'https://picsum.photos/1280/720?grayscale');
  }

  // Inline styles for scaling
  const containerStyle: React.CSSProperties = {
    width: '1280px',
    height: '720px',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    backgroundColor: 'white',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: "'Inter', sans-serif", 
  };

  return (
    <div style={containerStyle}>
        {/* Render the Generative UI */}
        <div 
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: processedHtml }} 
        />
    </div>
  );
};

export default SlideRenderer;