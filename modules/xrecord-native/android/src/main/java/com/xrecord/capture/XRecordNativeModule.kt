package com.xrecord.capture

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.provider.Settings.Secure
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class XRecordNativeModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx), ActivityEventListener {

    private var pending: Promise? = null
    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == XRecordAccessibilityService.ACTION_POINT_SELECTED) {
                val point = Arguments.createMap().apply {
                    putInt("x", intent.getIntExtra("x", 0))
                    putInt("y", intent.getIntExtra("y", 0))
                }
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("XRecordPointSelected", point)
                return
            }
            if (intent?.action != XRecordCaptureService.ACTION_DETECTED) return
            val map = Arguments.createMap().apply {
                putDouble("timestamp", intent.getLongExtra("timestamp", 0L).toDouble())
                putInt("difference", intent.getIntExtra("difference", 0))
                putInt("count", intent.getIntExtra("count", 0))
                putBoolean("tapSent", false)
                putInt("latencyMs", intent.getIntExtra("latencyMs", 0))
            }
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("XRecordDetection", map)
        }
    }

    init {
        ctx.addActivityEventListener(this)
        val filter = IntentFilter().apply {
            addAction(XRecordCaptureService.ACTION_DETECTED)
            addAction(XRecordAccessibilityService.ACTION_POINT_SELECTED)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            ctx.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            ctx.registerReceiver(receiver, filter)
        }
    }

    override fun getName() = "XRecordNative"
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    @ReactMethod fun isOverlayAllowed(p: Promise) {
        p.resolve(Settings.canDrawOverlays(ctx))
    }

    @ReactMethod
    fun requestOverlayPermission(p: Promise) {
        if (Settings.canDrawOverlays(ctx)) { p.resolve(true); return }
        val activity = ctx.currentActivity
        if (activity == null) { p.reject("NO_ACTIVITY", "Activity unavailable"); return }
        try {
            activity.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${ctx.packageName}")))
            p.resolve(false)
        } catch (e: Exception) { p.reject("OVERLAY_SETTINGS", e) }
    }

    @ReactMethod
    fun isAccessibilityEnabled(p: Promise) {
        try {
            val enabled = Secure.getInt(ctx.contentResolver, Secure.ACCESSIBILITY_ENABLED, 0) == 1
            val services = Secure.getString(ctx.contentResolver, Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
            p.resolve(enabled && services.contains("${ctx.packageName}/com.xrecord.capture.XRecordAccessibilityService"))
        } catch (_: Exception) { p.resolve(false) }
    }

    @ReactMethod
    fun openAccessibilitySettings(p: Promise) {
        try {
            val i = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ctx.startActivity(i)
            p.resolve(true)
        } catch (e: Exception) { p.reject("ACCESSIBILITY_SETTINGS", e) }
    }

    @ReactMethod
    fun setTapPoint(x: Double, y: Double, p: Promise) {
        val prefs = ctx.getSharedPreferences("xrecord", Context.MODE_PRIVATE)
        prefs.edit().putInt("tap_x", x.toInt()).putInt("tap_y", y.toInt()).apply()
        p.resolve(true)
    }


    @ReactMethod
    fun setSensitivity(value: Int, p: Promise) {
        val safeValue = value.coerceIn(1, 60)
        ctx.getSharedPreferences("xrecord", Context.MODE_PRIVATE)
            .edit().putInt("sensitivity", safeValue).apply()
        p.resolve(safeValue)
    }

    @ReactMethod
    fun openPointPicker(p: Promise) {
        val opened = XRecordAccessibilityService.showPointPicker()
        if (opened) p.resolve(true) else p.reject("ACCESSIBILITY_UNAVAILABLE", "Включите XRecord в специальных возможностях Android")
    }

    @ReactMethod
    fun startMonitoring(p: Promise) {
        val activity = ctx.currentActivity
        if (activity == null) { p.reject("NO_ACTIVITY", "Activity unavailable"); return }
        if (!Settings.canDrawOverlays(ctx)) { p.reject("OVERLAY_REQUIRED", "Overlay permission required"); return }
        if (pending != null) { p.reject("BUSY", "Permission request already active"); return }
        pending = p
        val manager = ctx.getSystemService(Activity.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        activity.startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_CAPTURE)
    }

    @ReactMethod
    fun stopMonitoring(p: Promise) {
        ctx.stopService(Intent(ctx, XRecordCaptureService::class.java))
        XRecordAccessibilityService.disarm()
        p.resolve(true)
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_CAPTURE) return
        val promise = pending ?: return
        pending = null
        if (resultCode != Activity.RESULT_OK || data == null) {
            promise.reject("CAPTURE_DENIED", "Screen capture permission was not granted")
            return
        }
        val i = Intent(ctx, XRecordCaptureService::class.java).apply {
            action = XRecordCaptureService.ACTION_START
            putExtra(XRecordCaptureService.EXTRA_RESULT_CODE, resultCode)
            putExtra(XRecordCaptureService.EXTRA_DATA, data)
        }
        try {
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("SERVICE_START_FAILED", e) }
    }

    override fun onNewIntent(intent: Intent) {}

    override fun invalidate() {
        try { ctx.unregisterReceiver(receiver) } catch (_: Exception) {}
        super.invalidate()
    }

    companion object { const val REQUEST_CAPTURE = 4821 }
}
