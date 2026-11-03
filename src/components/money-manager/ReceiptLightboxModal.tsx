import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Receipt } from 'lucide-react';

export interface ReceiptLightboxModalProps {
  isOpen: boolean;
  images: string[];
  title: string;
  initialIndex?: number;
  onClose: () => void;
}

export const ReceiptLightboxModal: React.FC<ReceiptLightboxModalProps> = ({
  isOpen,
  images,
  title,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, images]);

  useEffect(() => {
    if (!isOpen || images.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images, onClose]);

  if (!isOpen || !images || images.length === 0) {
    return null;
  }

  const activeImage = images[currentIndex] || images[0];

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = activeImage;
    link.download = `receipt-${currentIndex + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="mm-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Receipt Image Lightbox"
      onClick={onClose}
    >
      <div
        className="mm-lightbox-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mm-lightbox-header">
          <div className="mm-lightbox-meta">
            <span className="mm-lightbox-badge">
              <Receipt size={15} />
              Receipt {currentIndex + 1} of {images.length}
            </span>
            <div>
              <h4 className="mm-lightbox-title">{title || 'Attached Transaction Receipt'}</h4>
              <p className="mm-lightbox-subtitle">
                Stored locally in browser IndexedDB (Base64 image data)
              </p>
            </div>
          </div>

          <div className="mm-lightbox-actions">
            <button
              type="button"
              className="mm-btn mm-btn-secondary mm-btn-sm"
              onClick={handleDownload}
              title="Download receipt image"
            >
              <Download size={15} />
              <span>Save Image</span>
            </button>
            <button
              type="button"
              className="mm-icon-btn"
              onClick={onClose}
              aria-label="Close lightbox"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="mm-lightbox-stage">
          {images.length > 1 && (
            <button
              type="button"
              className="mm-lightbox-nav mm-lightbox-nav-prev"
              onClick={() =>
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
              }
              aria-label="Previous receipt"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <img
            src={activeImage}
            alt={`Receipt ${currentIndex + 1} for ${title}`}
            className="mm-lightbox-img"
          />

          {images.length > 1 && (
            <button
              type="button"
              className="mm-lightbox-nav mm-lightbox-nav-next"
              onClick={() =>
                setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
              }
              aria-label="Next receipt"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div className="mm-lightbox-thumbs">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`mm-lightbox-thumb-btn ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
              >
                <img src={img} alt={`Thumb ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptLightboxModal;
