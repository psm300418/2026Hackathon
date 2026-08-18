package com.hackathon.skindata.core.notification

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

object RecordReminderScheduler {
    const val ACTION_RECORD_REMINDER = "com.hackathon.skindata.RECORD_REMINDER"
    const val CHANNEL_ID = "record_reminder"
    const val NOTIFICATION_ID = 1001

    private const val REQUEST_CODE = 1001
    private const val PREFS_NAME = "record_reminder_settings"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_HOUR = "hour"
    private const val KEY_MINUTE = "minute"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val channel = NotificationChannel(
            CHANNEL_ID,
            "기록 알림",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "오늘의 피부 기록을 남기도록 알려줍니다."
        }
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }

    fun saveSettings(
        context: Context,
        enabled: Boolean,
        hour: Int,
        minute: Int
    ) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_HOUR, hour.coerceIn(0, 23))
            .putInt(KEY_MINUTE, minute.coerceIn(0, 59))
            .apply()

        if (enabled) {
            schedule(context, hour, minute)
        } else {
            cancel(context)
        }
    }

    fun loadSettings(context: Context): RecordReminderSettings {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return RecordReminderSettings(
            enabled = prefs.getBoolean(KEY_ENABLED, false),
            hour = prefs.getInt(KEY_HOUR, 21),
            minute = prefs.getInt(KEY_MINUTE, 0)
        )
    }

    fun rescheduleIfEnabled(context: Context) {
        val settings = loadSettings(context)

        if (settings.enabled) {
            schedule(context, settings.hour, settings.minute)
        }
    }

    private fun schedule(
        context: Context,
        hour: Int,
        minute: Int
    ) {
        ensureChannel(context)

        val alarmManager = context.getSystemService(AlarmManager::class.java)
        val triggerAt = nextTriggerTime(hour.coerceIn(0, 23), minute.coerceIn(0, 59))
        alarmManager.setInexactRepeating(
            AlarmManager.RTC_WAKEUP,
            triggerAt,
            AlarmManager.INTERVAL_DAY,
            reminderPendingIntent(context)
        )
    }

    private fun cancel(context: Context) {
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        alarmManager.cancel(reminderPendingIntent(context))
    }

    private fun reminderPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, RecordReminderReceiver::class.java).apply {
            action = ACTION_RECORD_REMINDER
        }
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun nextTriggerTime(
        hour: Int,
        minute: Int
    ): Long {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        if (calendar.timeInMillis <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1)
        }

        return calendar.timeInMillis
    }
}

data class RecordReminderSettings(
    val enabled: Boolean,
    val hour: Int,
    val minute: Int
)
