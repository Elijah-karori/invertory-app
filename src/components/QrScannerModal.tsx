import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  FlipHorizontal,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ScanLine,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedValue: string) => void;
  title?: string;
  description?: string;
  mockSamples?: { label: string; value: string }[];
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Device QR / Barcode',
  description = 'Point camera at the ONT or Router Serial Number (S/N) QR code or barcode',
  mockSamples = [
    { label: 'EchoLife HG8546M (S/N)', value: '4857544321A89F01' },
    { label: 'EchoLife HG8145V5 (Faulty S/N)', value: '4857544378B44123' },
    { label: 'OptiXstar HG8145V6 (S/N)', value: '4857544366DD1044' },
    { label: 'Asset ID (INV-ONT-0001)', value: 'INV-ONT-0001' }
  ]
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [beepEnabled, setBeepEnabled] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setImageError('Failed to process image canvas context.');
          return;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (code && code.data) {
          handleScanFound(code.data);
        } else {
          setImageError('No clear QR code or barcode detected in uploaded image. Please try another photo or enter S/N manually.');
        }
      };
      img.onerror = () => {
        setImageError('Unable to load image file.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Audio Beep on successful scan using Web Audio API
  const playBeep = () => {
    if (!beepEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext may be blocked before interaction
    }
  };

  const handleScanFound = (rawText: string) => {
    let clean = rawText.trim();

    // Check if JSON payload (e.g. {"sn": "...", "model": "..."})
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        clean = parsed.sn || parsed.serialNumber || parsed.serial || parsed.assetId || clean;
      } catch {
        // use raw clean
      }
    }

    // Check if URL (e.g. https://ont.isp/device?sn=4857544321A89F01)
    if (clean.includes('?') && clean.includes('sn=')) {
      try {
        const url = new URL(clean);
        const snParam = url.searchParams.get('sn') || url.searchParams.get('serial');
        if (snParam) clean = snParam;
      } catch {
        // use raw clean
      }
    }

    playBeep();
    stopCamera();
    onScanSuccess(clean);
  };

  // Start Camera Stream
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera MediaDevices API is not supported in this browser or context.');
      }

      // Stop previous stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
      setHasTorch(Boolean(capabilities.torch));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        await videoRef.current.play();
        setCameraActive(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.warn('Camera stream request failed:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera hardware was detected on this terminal.');
      } else {
        setErrorMessage(err.message || 'Unable to initialize optical camera feed.');
      }
    }
  };

  // Toggle Flashlight / Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      const next = !torchOn;
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: next }]
        });
        setTorchOn(next);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // Scanning loop
  const tickScan = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tickScan);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });

      if (code && code.data) {
        handleScanFound(code.data);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(tickScan);
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
              <p className="text-[11px] text-slate-400">{description}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative bg-black flex-1 min-h-[280px] max-h-[360px] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Camera Controls Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                title="Toggle Flashlight"
                className={`p-2 rounded-full backdrop-blur-md transition ${
                  torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900/70 text-slate-200 border border-slate-700'
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'))}
              title="Switch Camera (Front/Rear)"
              className="p-2 bg-slate-900/70 border border-slate-700 text-slate-200 rounded-full backdrop-blur-md hover:bg-slate-800 transition"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setBeepEnabled(!beepEnabled)}
              title="Toggle Audio Feedback"
              className="p-2 bg-slate-900/70 border border-slate-700 text-slate-200 rounded-full backdrop-blur-md hover:bg-slate-800 transition"
            >
              {beepEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>

          {/* Aiming Reticle & Animated Scanline */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64 border-2 border-cyan-400/40 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>

                {/* Laser Scanning Line Animation */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-[scan_2s_ease-in-out_infinite]"></div>

                {/* Center Target Point */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-8 h-8 border border-dashed border-cyan-400 rounded-full"></div>
                </div>
              </div>
            </div>
          )}

          {/* Fallback / Error Banner if Camera is not active */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-10">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 mb-3">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Optical Stream Inactive</h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                {errorMessage || 'Camera stream is unavailable. You can use manual entry or simulated barcode triggers below.'}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition shadow"
              >
                Retry Camera Access
              </button>
            </div>
          )}
        </div>

        {/* Footer: Image Extraction, Manual Entry & Quick Hardware Simulators */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          {imageError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{imageError}</span>
            </div>
          )}

          {/* Upload Image for QR/Barcode Extraction */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 bg-cyan-600/15 hover:bg-cyan-600/25 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Extract QR / Barcode from Image File</span>
            </button>
          </div>

          {/* Manual S/N Fallback */}
          <form
            onSubmit={e => {
              e.preventDefault();
              if (manualCode.trim()) {
                handleScanFound(manualCode.trim());
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Or type/paste Serial Number manually..."
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition border border-slate-700 disabled:opacity-50"
            >
              Apply
            </button>
          </form>

          {/* Quick Barcode Simulation Buttons (for testing without physical camera) */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="font-mono uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Quick Test Devices
              </span>
              <span className="text-[10px] text-slate-500">Click to simulate QR scan</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mockSamples.map(sample => (
                <button
                  key={sample.value}
                  type="button"
                  onClick={() => handleScanFound(sample.value)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-lg text-left transition group"
                >
                  <div className="text-[11px] font-medium text-slate-200 group-hover:text-cyan-300 truncate">
                    {sample.label}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400/80 truncate">
                    {sample.value}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
