const { NativeModules, Platform } = require("react-native");

const Native = NativeModules.XRecordNative;

module.exports = {
  requestOverlayPermission: () => Native.requestOverlayPermission(),
  startMonitoring: () => Native.startMonitoring(),
  stopMonitoring: () => Native.stopMonitoring(),
  isOverlayAllowed: () => Native.isOverlayAllowed(),
  isAvailable: Platform.OS === "android" && !!Native,
};