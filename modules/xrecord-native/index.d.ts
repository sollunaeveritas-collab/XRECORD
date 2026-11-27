export type DetectionEvent = { timestamp: number; difference: number; count: number; tapSent: boolean };
declare const XRecordNative: {
  requestOverlayPermission(): Promise<boolean>;
  isOverlayAllowed(): Promise<boolean>;
  startMonitoring(): Promise<boolean>;
  stopMonitoring(): Promise<boolean>;
  setTapPoint(x: number, y: number): Promise<boolean>;
  openAccessibilitySettings(): Promise<boolean>;
  isAccessibilityEnabled(): Promise<boolean>;
  addDetectionListener(callback: (event: DetectionEvent) => void): { remove(): void };
  isAvailable: boolean;
};
export default XRecordNative;
