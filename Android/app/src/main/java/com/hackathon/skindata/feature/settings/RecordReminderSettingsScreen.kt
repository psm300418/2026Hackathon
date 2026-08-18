package com.hackathon.skindata.feature.settings

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.hackathon.skindata.core.designsystem.AppCard
import com.hackathon.skindata.core.designsystem.SkinOutlinedButton as OutlinedButton
import com.hackathon.skindata.core.designsystem.SkinPrimaryButton as Button
import com.hackathon.skindata.core.notification.RecordReminderScheduler
import com.hackathon.skindata.ui.theme.SkinDataTheme

@Composable
fun RecordReminderSettingsRoute() {
    val context = LocalContext.current
    val initialSettings = remember { RecordReminderScheduler.loadSettings(context) }
    var enabled by remember { mutableStateOf(initialSettings.enabled) }
    var hour by remember { mutableIntStateOf(initialSettings.hour) }
    var minute by remember { mutableIntStateOf(initialSettings.minute) }
    var message by remember { mutableStateOf<String?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            enabled = true
            RecordReminderScheduler.saveSettings(context, enabled = true, hour = hour, minute = minute)
            message = "기록 알림을 켰습니다."
        } else {
            enabled = false
            RecordReminderScheduler.saveSettings(context, enabled = false, hour = hour, minute = minute)
            message = "알림 권한이 없어 기록 알림을 켤 수 없습니다."
        }
    }

    fun hasNotificationPermission(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED

    fun save(
        nextEnabled: Boolean = enabled,
        nextHour: Int = hour,
        nextMinute: Int = minute
    ) {
        enabled = nextEnabled
        hour = nextHour.coerceIn(0, 23)
        minute = nextMinute.coerceIn(0, 59)
        RecordReminderScheduler.saveSettings(
            context = context,
            enabled = enabled,
            hour = hour,
            minute = minute
        )
        message = if (enabled) {
            "매일 ${formatTime(hour, minute)}에 기록 알림을 보냅니다."
        } else {
            "기록 알림을 껐습니다."
        }
    }

    RecordReminderSettingsScreen(
        enabled = enabled,
        hour = hour,
        minute = minute,
        message = message,
        onToggle = { nextEnabled ->
            if (nextEnabled && !hasNotificationPermission()) {
                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                save(nextEnabled = nextEnabled)
            }
        },
        onHourChanged = { nextHour -> save(nextHour = nextHour) },
        onMinuteChanged = { nextMinute -> save(nextMinute = nextMinute) }
    )
}

@Composable
fun RecordReminderSettingsScreen(
    enabled: Boolean,
    hour: Int,
    minute: Int,
    message: String?,
    onToggle: (Boolean) -> Unit,
    onHourChanged: (Int) -> Unit,
    onMinuteChanged: (Int) -> Unit
) {
    AppCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = "기록 알림", style = MaterialTheme.typography.titleMedium)
                Text(
                    text = "하루 한 번 피부 기록을 남기도록 기기 알림을 보냅니다.",
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Switch(checked = enabled, onCheckedChange = onToggle)
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(text = "알림 시간 ${formatTime(hour, minute)}", style = MaterialTheme.typography.bodyMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { onHourChanged(if (hour == 0) 23 else hour - 1) }) {
                Text("시 -")
            }
            Button(onClick = { onHourChanged((hour + 1) % 24) }) {
                Text("시 +")
            }
            OutlinedButton(onClick = { onMinuteChanged(if (minute == 0) 50 else minute - 10) }) {
                Text("분 -")
            }
            Button(onClick = { onMinuteChanged((minute + 10) % 60) }) {
                Text("분 +")
            }
        }

        message?.let {
            Text(text = it, style = MaterialTheme.typography.bodySmall)
        }
    }
}

private fun formatTime(hour: Int, minute: Int): String =
    "${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}"

@Preview(showBackground = true)
@Composable
private fun RecordReminderSettingsScreenPreview() {
    SkinDataTheme {
        RecordReminderSettingsScreen(
            enabled = true,
            hour = 21,
            minute = 0,
            message = "매일 21:00에 기록 알림을 보냅니다.",
            onToggle = {},
            onHourChanged = {},
            onMinuteChanged = {}
        )
    }
}
