package com.xrecord.capture

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.ActivityEventListener

class XRecordNativeModule(private val ctx: ReactApplicationContext) :
 ReactContextBaseJavaModule(ctx), ActivityEventListener {
 private var pending: Promise? = null
 companion object { const val REQUEST_CAPTURE = 4821 }
 init { ctx.addActivityEventListener(this) }
 override fun getName() = "XRecordNative"

 @ReactMethod fun isOverlayAllowed(p: Promise) {
   p.resolve(Settings.canDrawOverlays(ctx))
 }
 @ReactMethod fun requestOverlayPermission(p: Promise) {
   if (Settings.canDrawOverlays(ctx)) { p.resolve(true); return }
   val a=currentActivity
   if (a==null) { p.reject("NO_ACTIVITY","Activity unavailable"); return }
   try {
     val i=Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:"+ctx.packageName))
     a.startActivity(i)
     p.resolve(false)
   } catch(e:Exception) { p.reject("OVERLAY_SETTINGS",e) }
 }
 @ReactMethod fun startMonitoring(p: Promise) {
   val a=currentActivity
   if(a==null){p.reject("NO_ACTIVITY","Activity unavailable");return}
   if(!Settings.canDrawOverlays(ctx)){p.reject("OVERLAY_REQUIRED","Grant display-over-other-apps permission first");return}
   if(pending!=null){p.reject("BUSY","Permission request already active");return}
   pending=p
   val mgr=ctx.getSystemService(Activity.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
   a.startActivityForResult(mgr.createScreenCaptureIntent(), REQUEST_CAPTURE)
 }
 @ReactMethod fun stopMonitoring(p: Promise) {
   val i=Intent(ctx,XRecordCaptureService::class.java).setAction(XRecordCaptureService.ACTION_STOP)
   ctx.startService(i); p.resolve(true)
 }
 override fun onActivityResult(a:Activity, requestCode:Int, resultCode:Int, data:Intent?) {
   if(requestCode!=REQUEST_CAPTURE)return
   val promise=pending ?: return; pending=null
   if(resultCode!=Activity.RESULT_OK || data==null){promise.reject("CAPTURE_DENIED","Screen capture permission was not granted");return}
   val i=Intent(ctx,XRecordCaptureService::class.java).apply {
     action=XRecordCaptureService.ACTION_START
     putExtra(XRecordCaptureService.EXTRA_RESULT_CODE,resultCode)
     putExtra(XRecordCaptureService.EXTRA_DATA,data)
   }
   try {
     if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O) ctx.startForegroundService(i) else ctx.startService(i)
     promise.resolve(true)
   } catch(e:Exception){promise.reject("SERVICE_START_FAILED",e)}
 }
 override fun onNewIntent(i:Intent) {}
}