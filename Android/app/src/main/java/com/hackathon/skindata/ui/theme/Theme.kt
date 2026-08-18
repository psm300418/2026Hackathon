package com.hackathon.skindata.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import com.hackathon.skindata.core.designsystem.SkinColors

private val LightColors = lightColorScheme(
    primary = SkinColors.PrimaryOlive,
    onPrimary = SkinColors.Surface,
    primaryContainer = SkinColors.PrimaryOliveSoft,
    onPrimaryContainer = SkinColors.TextPrimary,
    secondary = SkinColors.AccentCoral,
    secondaryContainer = SkinColors.AccentCoralSoft,
    background = SkinColors.BackgroundWarm,
    onBackground = SkinColors.TextPrimary,
    surface = SkinColors.Surface,
    surfaceVariant = SkinColors.SurfaceSoft,
    onSurface = SkinColors.TextPrimary,
    onSurfaceVariant = SkinColors.TextSecondary,
    outline = SkinColors.Border
)

@Composable
fun SkinDataTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        content = content
    )
}
