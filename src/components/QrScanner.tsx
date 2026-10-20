import Scanner from 'qr-scanner';
import { useEffect, useRef, useState } from 'react';

type CameraState = 'starting' | 'running' | 'unavailable';

const CAMERA_TEXT: Record<Exclude<CameraState, 'running'>, string> = {
  starting: 'Starting camera…',
  unavailable: 'Camera unavailable. Enter the code below instead.',
};

/* Corner brackets from the Figma scanner, in its 254 px box: each arm runs
   75 px from the corner around the box's 23 px radius, centred on the edge. */
const BRACKETS: readonly string[] = [
  'M0 75V23A23 23 0 0 1 23 0H75',
  'M179 0H231A23 23 0 0 1 254 23V75',
  'M254 179V231A23 23 0 0 1 231 254H179',
  'M75 254H23A23 23 0 0 1 0 231V179',
];

/**
 * Live camera that reports each decoded QR once. Results are ignored while
 * `paused`, so a QR held in view does not resubmit during a redeem.
 */
export function QrScanner({ onResult, paused }: { onResult: (text: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>('starting');
  // Refs, so the scanner is built once and still sees the latest props.
  const onResultRef = useRef(onResult);
  const pausedRef = useRef(paused);
  const lastRef = useRef<string | null>(null);
  onResultRef.current = onResult;
  pausedRef.current = paused;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const scanner = new Scanner(
      video,
      (result) => {
        if (pausedRef.current || result.data === lastRef.current) return;
        lastRef.current = result.data;
        onResultRef.current(result.data);
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

  // A failed redeem may be retried by scanning the same QR again.
  useEffect(() => {
    if (!paused) lastRef.current = null;
  }, [paused]);

  return (
    <div className="camera">
      <div className="camera-view">
        <video ref={videoRef} muted playsInline />
        {state !== 'running' && <p className="camera-message">{CAMERA_TEXT[state]}</p>}
      </div>
      <svg className="camera-frame" viewBox="0 0 254 254" aria-hidden="true">
        {BRACKETS.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </div>
  );
}
