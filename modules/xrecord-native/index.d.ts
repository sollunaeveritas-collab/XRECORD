export type DetectionEvent = { timestamp: number; difference: number; count: number; tapSent: false; latencyMs: number };
export type PointSelectedEvent = { x: number; y: number };
declare const XRecordNative: {
  requestOverlayPermission(): Promise<boolean>;
  isOverlayAllowed(): Promise<boolean>;
  startMonitoring(): Promise<boolean>;
  stopMonitoring(): Promise<boolean>;
  setTapPoint(x: number, y: number): Promise<boolean>;
  setSensitivity(value: number): Promise<number>;
  openPointPicker(): Promise<boolean>;
  openAccessibilitySettings(): Promise<boolean>;
  isAccessibilityEnabled(): Promise<boolean>;
  addDetectionListener(callback: (event: DetectionEvent) => void): { remove(): void };
  addPointSelectedListener(callback: (event: PointSelectedEvent) => void): { remove(): void };
  isAvailable: boolean;
};
export default XRecordNative;
