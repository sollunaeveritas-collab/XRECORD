export function requestOverlayPermission(): Promise<boolean>;
export function startMonitoring(): Promise<boolean>;
export function stopMonitoring(): Promise<boolean>;
export function isOverlayAllowed(): Promise<boolean>;
export const isAvailable: boolean;