package com.xrecord.capture

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.os.*
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.abs
import android.os.SystemClock

class XRecordCaptureService : Service() {
    companion object {
        const val ACTION_START = "com.xrecord.START"
        const val ACTION_STOP = "com.xrecord.STOP"
        const val ACTION_DETECTED = "com.xrecord.DETECTED"
        const val EXTRA_RESULT_CODE = "resultCode"
        const val EXTRA_DATA = "resultData"
        private const val CHANNEL = "xrecord_monitor"
        private const val NOTIFICATION_ID = 7401
    }

    private var projection: MediaProjection? = null
    private var reader: ImageReader? = null
    private var display: VirtualDisplay? = null
    private var handler: Handler? = null
    private var wm: WindowManager? = null
    private var panel: LinearLayout? = null
    private var status: TextView? = null
    private var play: Button? = null
    private var previous: IntArray? = null
    private var lastDetection = 0L
    private var screenW = 0
    private var screenH = 0
    private var density = 1
    @Volatile private var playing = false
    private var count = 0
    private var sensitivity = 10
    private var tapX = 540
    private var tapY = 1200
    private var tapDelayMs = 0

    private val loop = object : Runnable {
        override fun run() {
            if (playing) sampleFrame()
            handler?.postDelayed(this, 70)
        }
    }

    override fun onBind(intent: Intent?) = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> { stopSelf(); return START_NOT_STICKY }
            ACTION_START -> {
                createChannel()
                startForeground(NOTIFICATION_ID, notification("Захват экрана запущен"))
                val code = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
                val data = intent.getParcelableExtra<Intent>(EXTRA_DATA)
                if (data != null && projection == null) startCapture(code, data)
            }
        }
        return START_STICKY
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(NotificationChannel(CHANNEL, "XRecord мониторинг", NotificationManager.IMPORTANCE_LOW))
        }
    }

    private fun notification(message: String): Notification {
        val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
        return b.setContentTitle("XRecord").setContentText(message)
            .setSmallIcon(android.R.drawable.ic_menu_view).setOngoing(true).build()
    }

    private fun startCapture(code: Int, data: Intent) {
        try {
            val m = resources.displayMetrics
            screenW = m.widthPixels
            screenH = m.heightPixels
            density = m.densityDpi
            val prefs = getSharedPreferences("xrecord", Context.MODE_PRIVATE)
            sensitivity = prefs.getInt("sensitivity", 10).coerceIn(1, 60)
            tapX = prefs.getInt("tap_x", screenW / 2).coerceIn(0, screenW - 1)
            tapY = prefs.getInt("tap_y", (screenH * 2 / 3)).coerceIn(0, screenH - 1)
            tapDelayMs = prefs.getInt("tap_delay_ms", 0).coerceIn(0, 2000)
            val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as android.media.projection.MediaProjectionManager
            projection = manager.getMediaProjection(code, data)
            projection?.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() { stopSelf() }
            }, Handler(Looper.getMainLooper()))
            reader = ImageReader.newInstance(screenW, screenH, PixelFormat.RGBA_8888, 3)
            display = projection?.createVirtualDisplay(
                "XRecordCapture", screenW, screenH, density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, reader?.surface, null, null
            )
            handler = Handler(Looper.getMainLooper())
            showPanel()
            setPlaying(false)
            handler?.post(loop)
        } catch (_: Exception) { stopSelf() }
    }

    private fun showPanel() {
        if (!Settings.canDrawOverlays(this)) return
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(12, 8, 12, 8)
            setBackgroundColor(0xEE171C26.toInt())
        }
        val heading = TextView(this).apply {
            text = "XRECORD • PAUSE"
            textSize = 12f
            setTextColor(0xFFFFFFFF.toInt())
            setPadding(8, 5, 8, 8)
        }
        val playButton = Button(this).apply { text = "▶ PLAY"; isAllCaps = false }
        playButton.setOnClickListener { setPlaying(!playing) }
        val stopButton = Button(this).apply { text = "■ STOP"; isAllCaps = false }
        stopButton.setOnClickListener { stopSelf() }
        box.addView(heading); box.addView(playButton); box.addView(stopButton)
        val type = if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
            type, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.TOP or Gravity.END; x = 18; y = 170 }
        heading.setOnTouchListener(object : View.OnTouchListener {
            var rawX = 0f; var rawY = 0f; var oldX = 0; var oldY = 0
            override fun onTouch(v: View, e: MotionEvent): Boolean {
                when (e.action) {
                    MotionEvent.ACTION_DOWN -> { rawX=e.rawX; rawY=e.rawY; oldX=params.x; oldY=params.y; return true }
                    MotionEvent.ACTION_MOVE -> {
                        params.x = oldX + (rawX-e.rawX).toInt()
                        params.y = oldY + (e.rawY-rawY).toInt()
                        try { wm?.updateViewLayout(box, params) } catch (_: Exception) {}
                        return true
                    }
                }
                return false
            }
        })
        try {
            wm?.addView(box, params)
            panel=box; status=heading; play=playButton
        } catch (_: Exception) {}
    }

    private fun setPlaying(value: Boolean) {
        playing = value
        previous = null
        if (value) XRecordAccessibilityService.arm() else XRecordAccessibilityService.disarm()
        status?.text = if (value) "XRECORD • PLAY" else "XRECORD • PAUSE"
        play?.text = if (value) "Ⅱ PAUSE" else "▶ PLAY"
        getSystemService(NotificationManager::class.java)
            .notify(NOTIFICATION_ID, notification(if (value) "Обнаружение включено" else "Пауза"))
    }

    private fun sampleFrame() {
        val sampleStarted = SystemClock.elapsedRealtime()
        val image: Image = reader?.acquireLatestImage() ?: return
        try {
            val plane = image.planes[0]
            val buffer = plane.buffer
            val rowStride = plane.rowStride
            val pixelStride = plane.pixelStride
            val cx = screenW / 2
            val cy = screenH / 2
            val radius = (minOf(screenW, screenH) * 0.06f).toInt().coerceAtLeast(4)
            val points = ArrayList<Int>(25)
            for (gy in -2..2) for (gx in -2..2) {
                val x = (cx + gx * radius / 2).coerceIn(0, screenW-1)
                val y = (cy + gy * radius / 2).coerceIn(0, screenH-1)
                val index = y * rowStride + x * pixelStride
                if (index >= 0 && index + 2 < buffer.capacity()) {
                    val r = buffer.get(index).toInt() and 255
                    val g = buffer.get(index+1).toInt() and 255
                    val b = buffer.get(index+2).toInt() and 255
                    points.add((r shl 16) or (g shl 8) or b)
                }
            }
            if (points.isNotEmpty()) {
                val old = previous
                if (old != null && old.size == points.size) {
                    var diff = 0L
                    for (i in points.indices) {
                        val a=points[i]; val b=old[i]
                        diff += abs(((a shr 16) and 255)-((b shr 16) and 255)) +
                            abs(((a shr 8) and 255)-((b shr 8) and 255)) +
                            abs((a and 255)-(b and 255))
                    }
                    val avg = (diff / (points.size*3)).toInt()
                    val prefs = getSharedPreferences("xrecord", Context.MODE_PRIVATE)
                    sensitivity = prefs.getInt("sensitivity", sensitivity).coerceIn(1, 60)
                    if (avg >= sensitivity && System.currentTimeMillis()-lastDetection > 250) {
                        lastDetection=System.currentTimeMillis()
                        count++
                        val latencyMs = (SystemClock.elapsedRealtime() - sampleStarted).toInt()
                        val prefsNow = getSharedPreferences("xrecord", Context.MODE_PRIVATE)
                        tapX = prefsNow.getInt("tap_x", screenW / 2).coerceIn(0, screenW - 1)
                        tapY = prefsNow.getInt("tap_y", screenH * 2 / 3).coerceIn(0, screenH - 1)
                        tapDelayMs = prefsNow.getInt("tap_delay_ms", 0).coerceIn(0, 2000)
                        val detectedAt = SystemClock.elapsedRealtime()
                        val performTap = Runnable {
                            val sent = XRecordAccessibilityService.tap(tapX, tapY)
                            val totalMs = (SystemClock.elapsedRealtime() - detectedAt).toInt() + latencyMs
                            sendBroadcast(Intent(ACTION_DETECTED).setPackage(packageName)
                                .putExtra("timestamp", System.currentTimeMillis())
                                .putExtra("difference", avg)
                                .putExtra("count", count)
                                .putExtra("tapSent", sent)
                                .putExtra("latencyMs", totalMs))
                        }
                        if (tapDelayMs > 0) handler?.postDelayed(performTap, tapDelayMs) else performTap.run()
                        status?.text = "XRECORD • #$count"
                        getSystemService(NotificationManager::class.java)
                            .notify(NOTIFICATION_ID, notification("Изменение #$count • Δ $avg"))
                        handler?.postDelayed({
                            status?.text = if (playing) "XRECORD • PLAY" else "XRECORD • PAUSE"
                        }, 700)
                    }
                }
                previous = points.toIntArray()
            }
        } catch (_: Exception) {
        } finally { image.close() }
    }

    override fun onDestroy() {
        playing=false
        XRecordAccessibilityService.disarm()
        handler?.removeCallbacksAndMessages(null)
        try { wm?.removeView(panel) } catch (_: Exception) {}
        display?.release()
        reader?.close()
        projection?.stop()
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE) else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        super.onDestroy()
    }
}
