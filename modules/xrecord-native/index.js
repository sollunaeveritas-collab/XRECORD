const { NativeModules, NativeEventEmitter, Platform } = require("react-native");
const Native = NativeModules.XRecordNative;
const emitter = Native ? new NativeEventEmitter(Native) : null;

module.exports = {
  requestOverlayPermission: () => Native.requestOverlayPermission(),
  isOverlayAllowed: () => Native.isOverlayAllowed(),
  startMonitoring: () => Native.startMonitoring(),
  stopMonitoring: () => Native.stopMonitoring(),
  setTapPoint: (x, y) => Native.setTapPoint(x, y),
  openAccessibilitySettings: () => Native.openAccessibilitySettings(),
  isAccessibilityEnabled: () => Native.isAccessibilityEnabled(),
  addDetectionListener: (callback) => emitter
    ? emitter.addListener("XRecordDetection", callback)
    : { remove() {} },
  isAvailable: Platform.OS === "android" && !!Native,
};
