package com.aizhipiantai.app

import android.app.*
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.view.*
import android.widget.TextView

class FloatingBubbleService : Service() {
    private var wm: WindowManager? = null
    private var bubble: TextView? = null
    override fun onCreate() { super.onCreate(); createChannel(); startForeground(7, notification()); showBubble() }
    override fun onDestroy() { bubble?.let { wm?.removeView(it) }; super.onDestroy() }
    override fun onBind(intent: Intent?) = null
    private fun showBubble() {
        wm=getSystemService(WINDOW_SERVICE) as WindowManager
        bubble=TextView(this).apply { text="AI"; textSize=15f; setTextColor(-1); gravity=17; background=getDrawable(R.drawable.bubble_bg); elevation=12f; setOnClickListener { val i=Intent(this@FloatingBubbleService,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(i) } }
        val type=if(Build.VERSION.SDK_INT>=26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE
        val p=WindowManager.LayoutParams(60,60,type,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT).apply { gravity=Gravity.CENTER_VERTICAL or Gravity.RIGHT; x=16; y=0 }
        wm?.addView(bubble,p)
    }
    private fun createChannel(){ if(Build.VERSION.SDK_INT>=26) { val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager; nm.createNotificationChannel(NotificationChannel("aizhipiantai","AI制片台",NotificationManager.IMPORTANCE_LOW)) } }
    private fun notification(): Notification = Notification.Builder(this,"aizhipiantai").setContentTitle("AI制片台").setContentText("悬浮按钮已运行").setSmallIcon(android.R.drawable.ic_menu_camera).build()
}
