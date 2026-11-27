package com.xrecord.capture

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

class XRecordAccessibilityService : AccessibilityService() {
    companion object {
        @Volatile private var instance: XRecordAccessibilityService? = null
        @Volatile private var armed = false
        @Volatile private var targetPackage: String? = null
        const val ACTION_POINT_SELECTED = "com.xrecord.capture.POINT_SELECTED"
        fun arm() { armed = true; targetPackage = null }
        fun disarm() { armed = false; targetPackage = null }
        fun tap(x: Int, y: Int): Boolean {
            val service = instance ?: return false
            if (!armed || targetPackage.isNullOrBlank()) return false
            return service.dispatchTap(x.toFloat(), y.toFloat())
        }
        fun showPointPicker(): Boolean = instance?.showPicker() ?: false
    }

    private var pickerView: View? = null
    private var windowManager: WindowManager? = null

    override fun onServiceConnected() { super.onServiceConnected(); instance = this }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!armed || event == null) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg != applicationContext.packageName && targetPackage == null) targetPackage = pkg
    }

    private fun showPicker(): Boolean {
        if (pickerView != null) return true
        return try {
            val wm = getSystemService(WINDOW_SERVICE) as WindowManager
            windowManager = wm
            val prefs = getSharedPreferences("xrecord", Context.MODE_PRIVATE)
            val metrics = resources.displayMetrics
            val initialX = prefs.getInt("tap_x", metrics.widthPixels / 2).coerceIn(24, metrics.widthPixels - 24)
            val initialY = prefs.getInt("tap_y", metrics.heightPixels / 2).coerceIn(24, metrics.heightPixels - 120)
            val root = FrameLayout(this).apply { setBackgroundColor(0x33000000) }
            val marker = TargetMarker(this, initialX.toFloat(), initialY.toFloat())
            root.addView(marker, FrameLayout.LayoutParams(-1, -1))

            val panel = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(18, 14, 18, 14)
                background = GradientDrawable().apply { setColor(Color.rgb(20, 27, 39)); cornerRadius = 24f; setStroke(2, Color.rgb(232,73,80)) }
            }
            val title = TextView(this).apply {
                text = "ПЕРЕМЕСТИТЕ ПРИЦЕЛ НА КНОПКУ"
                setTextColor(Color.WHITE); textSize = 13f; typeface = Typeface.DEFAULT_BOLD; gravity = Gravity.CENTER
            }
            val coords = TextView(this).apply {
                text = "X: ${initialX}   Y: ${initialY}"
                setTextColor(Color.rgb(190,202,218)); textSize = 14f; gravity = Gravity.CENTER; setPadding(0, 8, 0, 10)
            }
            marker.onPositionChanged = { x, y -> coords.text = "X: $x   Y: $y" }
            val buttons = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER }
            val cancel = Button(this).apply { text = "ОТМЕНА"; setOnClickListener { closePicker() } }
            val save = Button(this).apply {
                text = "СОХРАНИТЬ"
                setOnClickListener {
                    val x = marker.pointX.toInt().coerceIn(0, metrics.widthPixels - 1)
                    val y = marker.pointY.toInt().coerceIn(0, metrics.heightPixels - 1)
                    getSharedPreferences("xrecord", Context.MODE_PRIVATE).edit().putInt("tap_x", x).putInt("tap_y", y).apply()
                    sendBroadcast(Intent(ACTION_POINT_SELECTED).setPackage(packageName).putExtra("x", x).putExtra("y", y))
                    closePicker()
                }
            }
            buttons.addView(cancel); buttons.addView(save)
            panel.addView(title); panel.addView(coords); panel.addView(buttons)
            val panelParams = FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM).apply { setMargins(18, 0, 18, 26) }
            root.addView(panel, panelParams)
            val params = WindowManager.LayoutParams(-1, -1, WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START }
            wm.addView(root, params)
            pickerView = root
            true
        } catch (_: Exception) { false }
    }

    private fun closePicker() {
        try { pickerView?.let { windowManager?.removeView(it) } } catch (_: Exception) {}
        pickerView = null
        windowManager = null
    }

    private class TargetMarker(context: Context, startX: Float, startY: Float) : View(context) {
        var pointX = startX
        var pointY = startY
        var onPositionChanged: ((Int, Int) -> Unit)? = null
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(255, 65, 75); strokeWidth = 5f; style = Paint.Style.STROKE }
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            canvas.drawCircle(pointX, pointY, 34f, paint)
            canvas.drawLine(pointX - 48, pointY, pointX + 48, pointY, paint)
            canvas.drawLine(pointX, pointY - 48, pointX, pointY + 48, paint)
            paint.style = Paint.Style.FILL
            canvas.drawCircle(pointX, pointY, 7f, paint)
            paint.style = Paint.Style.STROKE
        }
        override fun onTouchEvent(event: MotionEvent): Boolean {
            when (event.action) {
                MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                    pointX = event.rawX.coerceIn(24f, width - 24f)
                    pointY = event.rawY.coerceIn(24f, height - 150f)
                    onPositionChanged?.invoke(pointX.toInt(), pointY.toInt())
                    invalidate(); return true
                }
                MotionEvent.ACTION_UP -> return true
            }
            return true
        }
    }

    private fun dispatchTap(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val gesture = GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(path, 0, 70)).build()
        return dispatchGesture(gesture, null, Handler(Looper.getMainLooper()))
    }
    override fun onInterrupt() { disarm() }
    override fun onDestroy() { closePicker(); if (instance === this) instance = null; disarm(); super.onDestroy() }
}
