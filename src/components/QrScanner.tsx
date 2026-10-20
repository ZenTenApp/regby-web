import Scanner from 'qr-scanner';
import { useEffect, useRef, useState } from 'react';

import { ScanFrame } from './ScanFrame';

type CameraState = 'starting' | 'running' | 'unavailable';

const CAMERA_TEXT: Record<Exclude<CameraState, 'running'>, string> = {
  starting: 'Starting camera…',
  unavailable: 'Camera unavailable. Enter the code below instead.',
};

/**
 * Live camera that reports each decoded QR. Results are ignored while
 * `paused`, so a scan cannot race a typed redeem. The first result leaves
 * the screen, which unmounts the scanner, so no dedup is needed.
 */
export function QrScanner({ onResult, paused }: { onResult: (text: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>('starting');
  // Refs, so the scanner is built once and still sees the latest props.
  const onResultRef = useRef(onResult);
  const pausedRef = useRef(paused);
  onResultRef.current = onResult;
  pausedRef.current = paused;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const scanner = new Scanner(
      video,
      (result) => {
        if (!pausedRef.current) onResultRef.current(result.data);
      },
      { preferredCamera: 'environment', maxScansPerSecond: 5, returnDetailedScanResult: true },
    );
    scanner.start().then(
      () => setState('running'),
      () => setState('unavailable'),
    );
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, []);

  return (
    <div className="camera">
      <div className="camera-view">
        <video ref={videoRef} muted playsInline />
        {state !== 'running' && <p className="camera-message">{CAMERA_TEXT[state]}</p>}
      </div>
      <ScanFrame />
    </div>
  );
}
