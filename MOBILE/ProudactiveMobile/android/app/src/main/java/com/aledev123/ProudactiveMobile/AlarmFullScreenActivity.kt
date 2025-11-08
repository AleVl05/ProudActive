package com.aledev123.ProudactiveMobile

import android.app.AlarmManager
import android.app.KeyguardManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlin.math.abs

class AlarmFullScreenActivity : AppCompatActivity() {
  private var initialX = 0f
  private var dragging = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_alarm_fullscreen)

    // Configurar para mostrar sobre pantalla bloqueada
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      val km = getSystemService(KeyguardManager::class.java)
      km?.requestDismissKeyguard(this, null)
    } else {
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
      )
    }

    val title = intent.getStringExtra("title") ?: "Alarma"
    val body = intent.getStringExtra("body") ?: ""

    findViewById<TextView>(R.id.alarmTitle).text = title
    findViewById<TextView>(R.id.alarmBody).text = body

    val btnStop = findViewById<Button>(R.id.btnStop)
    val btnSnooze = findViewById<Button>(R.id.btnSnooze)
    val btnDrag = findViewById<Button>(R.id.btnDragStop)
    val swipeArea = findViewById<View>(R.id.swipeArea)

    btnStop.setOnClickListener {
      cancelNotificationAndFinish()
    }

    btnSnooze.setOnClickListener {
      // Reprogramar snooze: 5 minutos más tarde
      scheduleSnooze(5)
      cancelNotificationAndFinish()
    }

    // Simple drag detection para swipe to stop
    btnDrag.setOnTouchListener { v, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          initialX = event.rawX
          dragging = true
          true
        }
        MotionEvent.ACTION_MOVE -> {
          if (!dragging) return@setOnTouchListener false
          val dx = event.rawX - initialX
          if (dx > 0) {
            v.translationX = dx.coerceAtMost((swipeArea.width - v.width).toFloat())
          } else {
            v.translationX = 0f
          }
          true
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          val dxTotal = event.rawX - initialX
          dragging = false
          val threshold = (swipeArea.width * 0.6).toFloat()
          if (dxTotal >= threshold) {
            // Arrastró lo suficiente -> detener alarma
            cancelNotificationAndFinish()
          } else {
            // Volver al inicio
            v.animate().translationX(0f).setDuration(150).start()
          }
          true
        }
        else -> false
      }
    }
  }

  private fun scheduleSnooze(minutes: Int) {
    try {
      val am = getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(this, com.aledev123.AlarmReceiver::class.java).apply {
        putExtra("title", intent.getStringExtra("title") ?: "Alarma")
        putExtra("body", intent.getStringExtra("body") ?: "")
      }
      
      val pending = PendingIntent.getBroadcast(
        this,
        0,
        intent,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else PendingIntent.FLAG_UPDATE_CURRENT
      )

      val snoozeTime = System.currentTimeMillis() + (minutes * 60 * 1000).toLong()
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeTime, pending)
      } else {
        am.setExact(AlarmManager.RTC_WAKEUP, snoozeTime, pending)
      }
    } catch (e: Exception) {
      // Error al programar snooze, simplemente continuar
    }
  }

  private fun cancelNotificationAndFinish() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
    nm.cancel(1001)
    finish()
  }
}

