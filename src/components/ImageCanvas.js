'use client';

import { useEffect, useRef, useState } from 'react';

const ImageCanvas = ({ imageFile, boundingBoxes = [], width = 800, height = 600 }) => {
  const canvasRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [hoveredBox, setHoveredBox] = useState(null);

  // Color scheme for different waste categories
  const categoryColors = {
    recyclable: { border: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', text: '#166534' },
    compostable: { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', text: '#92400e' },
    landfill: { border: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', text: '#991b1b' }
  };

  useEffect(() => {
    if (!imageFile || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();

    img.onload = () => {
      const canvasAspect = width / height;
      const imageAspect = img.width / img.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imageAspect > canvasAspect) {
        drawWidth = width;
        drawHeight = width / imageAspect;
        offsetX = 0;
        offsetY = (height - drawHeight) / 2;
      } else {
        drawHeight = height;
        drawWidth = height * imageAspect;
        offsetX = (width - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      setImageDimensions({ width: drawWidth, height: drawHeight, offsetX, offsetY });
      setImageLoaded(true);
    };

    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile, width, height]);

  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || boundingBoxes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: imgWidth, height: imgHeight, offsetX, offsetY } = imageDimensions;

    // Clear previous drawings
    ctx.clearRect(0, 0, width, height);
    
    // Redraw the image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, offsetX, offsetY, imgWidth, imgHeight);
      
      // Draw bounding boxes
      boundingBoxes.forEach((box, index) => {
        const { x, y, width: boxWidth, height: boxHeight, label, confidence, category, description } = box;

        const canvasX = offsetX + x * imgWidth;
        const canvasY = offsetY + y * imgHeight;
        const canvasBoxWidth = boxWidth * imgWidth;
        const canvasBoxHeight = boxHeight * imgHeight;

        const colors = categoryColors[category] || categoryColors.recyclable;

        // Draw bounding box with category color
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3;
        ctx.strokeRect(canvasX, canvasY, canvasBoxWidth, canvasBoxHeight);

        // Draw category indicator
        ctx.fillStyle = colors.background;
        ctx.fillRect(canvasX, canvasY, canvasBoxWidth, canvasBoxHeight);

        // Draw label background
        const labelText = `${label} (${(confidence * 100).toFixed(0)}%)`;
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = 16;

        ctx.fillStyle = colors.border;
        ctx.fillRect(canvasX, canvasY - textHeight - 4, textWidth + 8, textHeight + 4);

        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, canvasX + 4, canvasY - 6);

        // Draw category badge
        const categoryText = category.toUpperCase();
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        const categoryMetrics = ctx.measureText(categoryText);
        const categoryWidth = categoryMetrics.width;

        ctx.fillStyle = colors.border;
        ctx.fillRect(canvasX + canvasBoxWidth - categoryWidth - 8, canvasY + 4, categoryWidth + 8, 16);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(categoryText, canvasX + canvasBoxWidth - categoryWidth - 4, canvasY + 16);
      });

      // Draw spatial relationship lines (connecting nearby objects)
      if (boundingBoxes.length > 1) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        boundingBoxes.forEach((box1, i) => {
          boundingBoxes.slice(i + 1).forEach((box2) => {
            const center1 = {
              x: offsetX + (box1.x + box1.width / 2) * imgWidth,
              y: offsetY + (box1.y + box1.height / 2) * imgHeight
            };
            const center2 = {
              x: offsetX + (box2.x + box2.width / 2) * imgWidth,
              y: offsetY + (box2.y + box2.height / 2) * imgHeight
            };

            const distance = Math.sqrt(
              Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2)
            );

            // Draw lines between objects that are close to each other
            if (distance < 150) {
              ctx.beginPath();
              ctx.moveTo(center1.x, center1.y);
              ctx.lineTo(center2.x, center2.y);
              ctx.stroke();
            }
          });
        });

        ctx.setLineDash([]);
      }
    };

    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [boundingBoxes, imageLoaded, imageDimensions, hoveredBox]);

  const handleCanvasClick = (event) => {
    if (!imageLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const { width: imgWidth, height: imgHeight, offsetX, offsetY } = imageDimensions;

    // Check if click is within any bounding box
    const clickedBox = boundingBoxes.find(box => {
      const canvasX = offsetX + box.x * imgWidth;
      const canvasY = offsetY + box.y * imgHeight;
      const canvasBoxWidth = box.width * imgWidth;
      const canvasBoxHeight = box.height * imgHeight;

      return x >= canvasX && x <= canvasX + canvasBoxWidth &&
             y >= canvasY && y <= canvasY + canvasBoxHeight;
    });

    if (clickedBox) {
      alert(`Spatial Analysis: ${clickedBox.description}\nCategory: ${clickedBox.category}\nConfidence: ${(clickedBox.confidence * 100).toFixed(1)}%`);
    }
  };

  if (!imageFile) {
    return (
      <div className="canvas-placeholder">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21,15 16,10 5,21" />
        </svg>
        <p>No image selected</p>
        <p className="text-sm text-gray-400">Upload an image to see Gemini AI's spatial understanding</p>
      </div>
    );
  }

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="image-canvas"
          onClick={handleCanvasClick}
          style={{ cursor: 'pointer' }}
        />
        {boundingBoxes.length > 0 && (
          <div className="canvas-info">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 12l2 2 4-4" />
              <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z" />
              <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z" />
              <path d="M12 3c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z" />
              <path d="M12 21c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z" />
            </svg>
            {boundingBoxes.length} object{boundingBoxes.length !== 1 ? 's' : ''} detected
            <span className="text-xs text-gray-500 ml-2">Click objects for details</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCanvas;
