package com.solobrowse.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Black = Color(0xFF000000)
val White = Color(0xFFFFFFFF)
val Gray50 = Color(0xFFF5F5F5)
val Gray200 = Color(0xFFE0E0E0)
val Gray600 = Color(0xFF666666)

private val SolobrowseColors = lightColorScheme(
    primary = Black,
    onPrimary = White,
    secondary = Black,
    onSecondary = White,
    background = White,
    onBackground = Black,
    surface = White,
    onSurface = Black,
    surfaceVariant = Gray50,
    onSurfaceVariant = Gray600,
    outline = Gray200
)

@Composable
fun SolobrowseTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SolobrowseColors,
        typography = Typography(),
        content = content
    )
}
