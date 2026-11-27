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
import android.media.projection.MediaProjectionManager
import android.os.*
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView
import kotlin.math.abs

class XRecordCaptureService : Service() {
 companion object {
  const val ACTION_START="com.xrecord.START", ACTION_STOP="com.xrecord.STOP"
  const val EXTRA_RESULT_CODE="resultCode", EXTRA_DATA="resultData"
  private const val CHANNEL="xrecord_monitor", NOTIFICATION_ID=7401
 }
 private var projection:MediaProjection?=null
 private var reader:ImageReader?=null
 private var display:VirtualDisplay?=null
 private var handler:Handler?=null
 private var overlay:TextView?=null
 private var wm:WindowManager?=null
 private var previous:IntArray?=null
 private var lastAlert=0L
 private var screenW=0; private var screenH=0; private var density=1
 private val loop=object:Runnable { override fun run(){ sampleFrame(); handler?.postDelayed(this,90) } }

 override fun onBind(intent:Intent?)=null
 override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
  if(intent?.action==ACTION_STOP){ stopSelf(); return START_NOT_STICKY }
  if(intent?.action==ACTION_START){
   createChannel(); startForeground(NOTIFICATION_ID,notification("Запущен анализ центральной области"))
   val code=intent.getIntExtra(EXTRA_RESULT_CODE,Activity.RESULT_CANCELED)
   val data=intent.getParcelableExtra<Intent>(EXTRA_DATA)
   if(data!=null) startCapture(code,data)
  }
  return START_NOT_STICKY
 }
 private fun createChannel(){
  if(Build.VERSION.SDK_INT>=26){val ch=NotificationChannel(CHANNEL,"XRecord мониторинг",NotificationManager.IMPORTANCE_LOW);getSystemService(NotificationManager::class.java).createNotificationChannel(ch)}
 }
 private fun notification(msg:String):Notification {
  val b=if(Build.VERSION.SDK_INT>=26) Notification.Builder(this,CHANNEL) else Notification.Builder(this)
  return b.setContentTitle("XRecord").setContentText(msg).setSmallIcon(android.R.drawable.ic_menu_view).setOngoing(true).build()
 }
 private fun startCapture(code:Int,data:Intent){
  try {
   val metrics=resources.displayMetrics; screenW=metrics.widthPixels;screenH=metrics.heightPixels;density=metrics.densityDpi
   val mgr=getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
   projection=mgr.getMediaProjection(code,data)
   reader=ImageReader.newInstance(screenW,screenH,PixelFormat.RGBA_8888,2)
   display=projection?.createVirtualDisplay("XRecordCapture",screenW,screenH,density,DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,reader?.surface,null,null)
   handler=Handler(Looper.getMainLooper()); showOverlay(); handler?.post(loop)
  }catch(e:Exception){stopSelf()}
 }
 private fun showOverlay(){
  if(!Settings.canDrawOverlays(this))return
  wm=getSystemService(WINDOW_SERVICE) as WindowManager
  val v=TextView(this).apply{text="XR • ON";setTextColor(0xFFFFFFFF.toInt());textSize=11f;setPadding(18,12,18,12);setBackgroundColor(0xCCB82030.toInt())}
  val type=if(Build.VERSION.SDK_INT>=26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE
  val lp=WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.WRAP_CONTENT,type,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT)
  lp.gravity=Gravity.TOP or Gravity.END;lp.x=18;lp.y=180
  try{wm?.addView(v,lp);overlay=v}catch(_:Exception){}
 }
 private fun sampleFrame(){
  val img:Image=reader?.acquireLatestImage()?:return
  try {
   val plane=img.planes[0];val buf=plane.buffer;val pixelStride=plane.pixelStride;val rowStride=plane.rowStride
   val cx=screenW/2;val cy=screenH/2;val half= (minOf(screenW,screenH)*0.06f).toInt().coerceAtLeast(4)
   val points=ArrayList<Int>(25)
   for(gy in -2..2)for(gx in -2..2){
    val x=(cx+gx*half/2).coerceIn(0,screenW-1);val y=(cy+gy*half/2).coerceIn(0,screenH-1)
    val index=y*rowStride+x*pixelStride
    if(index+2<buf.capacity()){val r=buf.get(index).toInt() and 255;val g=buf.get(index+1).toInt() and 255;val b=buf.get(index+2).toInt() and 255;points.add((r shl 16) or (g shl 8) or b)}
   }
   if(points.isNotEmpty()){
    val old=previous
    if(old!=null && old.size==points.size){
     var diff=0L;for(i in points.indices){val a=points[i];val b=old[i];diff+=(abs(((a shr 16)and 255)-((b shr 16)and 255))+abs(((a shr 8)and 255)-((b shr 8)and 255))+abs((a and 255)-(b and 255)))}
     val avg=diff/(points.size*3)
     if(avg>24 && System.currentTimeMillis()-lastAlert>900){lastAlert=System.currentTimeMillis();overlay?.text="XR • CHANGE";getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID,notification("Обнаружено изменение в центре экрана")); Handler(Looper.getMainLooper()).postDelayed({overlay?.text="XR • ON"},650)}
    }
    previous=points.toIntArray()
   }
  }catch(_:Exception){}finally{img.close()}
 }
 override fun onDestroy(){
  handler?.removeCallbacksAndMessages(null);try{wm?.removeView(overlay)}catch(_:Exception){}
  display?.release();reader?.close();projection?.stop();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy()
 }
}