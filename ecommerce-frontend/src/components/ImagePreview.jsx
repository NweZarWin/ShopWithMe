import { useEffect, useState } from 'react';
import './ImagePreview.css';

export function ImagePreview({ src, alt, className = '', imageClassName = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setZoom(1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const closePreview = () => {
    setIsOpen(false);
    setZoom(1);
  };

  return (
    <>
      <button
        className={`image-preview-trigger ${className}`}
        type="button"
        aria-label={`Preview ${alt}`}
        onClick={() => {
          setZoom(1);
          setIsOpen(true);
        }}
      >
        <img className={`image-preview-thumbnail ${imageClassName}`} src={src} alt={alt} />
      </button>

      {isOpen && (
        <div
          className="image-preview-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} image preview`}
          onClick={(event) => {
            if (event.target === event.currentTarget) closePreview();
          }}
        >
          <div className="image-preview-panel">
            <div className="image-preview-header">
              <span>{alt}</span>
              <button
                className="image-preview-close"
                type="button"
                aria-label="Close image preview"
                onClick={closePreview}
              >
                &times;
              </button>
            </div>
            <div className="image-preview-viewport">
              <img
                className="image-preview-large-image"
                src={src}
                alt={alt}
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
            <div className="image-preview-controls">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoom <= 1}
                onClick={() => setZoom((currentZoom) => Math.max(1, currentZoom - 0.25))}
              >
                &minus;
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={zoom >= 3}
                onClick={() => setZoom((currentZoom) => Math.min(3, currentZoom + 0.25))}
              >
                +
              </button>
              <button type="button" onClick={() => setZoom(1)}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
