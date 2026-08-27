import React from 'react';
import { motion } from 'motion/react';
import { X, Download, ZoomIn } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl,
  onClose,
}) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `love-you-photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl cursor-zoom-out"
    >
      {/* Top Action Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 flex items-center gap-3 z-10"
      >
        <button
          type="button"
          onClick={handleDownload}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
          title="Download photo"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
          title="Close viewer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <motion.div
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.92 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-4xl max-h-[85vh] relative flex items-center justify-center cursor-default"
      >
        <img
          src={imageUrl}
          alt="Full photo"
          referrerPolicy="no-referrer"
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
        />
      </motion.div>
    </motion.div>
  );
};
