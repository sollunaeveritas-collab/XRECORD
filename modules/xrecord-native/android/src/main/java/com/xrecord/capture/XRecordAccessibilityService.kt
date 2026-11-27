package com.xrecord.capture

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import android.os.Handler
import android.os.Looper

class XRecordAccessibilityService : AccessibilityService() {
    companion object {
        @Volatile private var instance: XRecordAccessibilityService? = null
        @Volatile private var armed = false
        @Volatile private var targetPackage: String? = null

        fun arm() {
            armed = true
            targetPackage = null
        }

        fun disarm() {
            armed = false
            targetPackage = null
        }

        fun tap(x: Int, y: Int): Boolean {
            val service = instance ?: return false
            if (!armed || targetPackage.isNullOrBlank()) return false
            return service.dispatchTap(x.toFloat(), y.toFloat())
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!armed || event == null) return
        val pkg = event.packageName?.toString() ?: return
        // Lock to the first foreground app other than XRecord while PLAY is active.
        if (pkg != applicationContext.packageName && targetPackage == null) {
            targetPackage = pkg
        }
    }

    private fun dispatchTap(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 70))
            .build()
        return dispatchGesture(gesture, null, Handler(Looper.getMainLooper()))
    }

    override fun onInterrupt() { disarm() }

    override fun onDestroy() {
        if (instance === this) instance = null
        disarm()
        super.onDestroy()
    }
}
