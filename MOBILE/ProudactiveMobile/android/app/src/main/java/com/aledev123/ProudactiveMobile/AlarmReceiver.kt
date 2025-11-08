package com.aledev123

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import android.app.PendingIntent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val channelId = "proudly_alarm_channel"
    val notificationId = 1001

    val fullScreenIntent = Intent(context, com.aledev123.ProudactiveMobile.AlarmFullScreenActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      putExtra("title", intent.getStringExtra("title"))
      putExtra("body", intent.getStringExtra("body"))
    }

    val fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      0,
      fullScreenIntent,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      else PendingIntent.FLAG_UPDATE_CURRENT
    )

    val builder = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(intent.getStringExtra("title") ?: "Alarma")
      .setContentText(intent.getStringExtra("body") ?: "Hora")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setAutoCancel(true)
      .setSound(android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI)
      .setFullScreenIntent(fullScreenPendingIntent, true)

    with(NotificationManagerCompat.from(context)) {
      notify(notificationId, builder.build())
    }
  }
}
