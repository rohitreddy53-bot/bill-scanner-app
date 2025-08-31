
import React, { useRef, useEffect, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access the camera. Please ensure you have given permission.");
        onCancel();
      }
    };

    startCamera();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [onCancel]);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
      }
    }
  }, [onCapture]);

  return (
    <div className="w-full max-w-lg mx-auto p-4 bg-slate-800 rounded-lg shadow-2xl">
      <div className="relative">
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-md" />
        <div className="absolute inset-0 border-4 border-primary-500/50 rounded-md pointer-events-none"></div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleCapture}
          className="w-full px-6 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-lg"
        >
          Scan Receipt
        </button>
        <button
          onClick={onCancel}
          className="w-full px-6 py-3 text-sm font-semibold text-slate-200 bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;
