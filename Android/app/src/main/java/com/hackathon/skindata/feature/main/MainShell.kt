package com.hackathon.skindata.feature.main

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Analytics
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.hackathon.skindata.core.designsystem.SectionHeader
import com.hackathon.skindata.core.designsystem.SkinColors
import com.hackathon.skindata.core.designsystem.SkinOutlinedButton as OutlinedButton
import com.hackathon.skindata.core.designsystem.SkinSpacing
import com.hackathon.skindata.feature.analysis.AnalysisRoute
import com.hackathon.skindata.feature.onboarding.SkinTypeSurveyRoute
import com.hackathon.skindata.feature.products.ProductRegistrationRoute
import com.hackathon.skindata.feature.records.DailyRecordRoute
import com.hackathon.skindata.feature.settings.LocationSettingsRoute
import com.hackathon.skindata.feature.settings.RecordReminderSettingsRoute

@Composable
fun MainShellRoute(
    accessToken: String,
    backendProfileVerified: Boolean,
    message: String?,
    onSignOut: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(MainTab.Products) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = SkinColors.Surface,
                tonalElevation = 0.dp
            ) {
                MainTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = null
                            )
                        },
                        label = { Text(tab.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = SkinColors.Ink,
                            selectedTextColor = SkinColors.Ink,
                            indicatorColor = SkinColors.PrimaryOlive,
                            unselectedIconColor = SkinColors.Muted,
                            unselectedTextColor = SkinColors.Muted
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (selectedTab) {
                MainTab.Products -> ProductsTab(accessToken = accessToken, message = message)
                MainTab.Record -> DailyRecordRoute(accessToken = accessToken)
                MainTab.Analysis -> AnalysisRoute(accessToken = accessToken)
                MainTab.Settings -> SettingsTab(
                    accessToken = accessToken,
                    onSignOut = onSignOut
                )
            }
        }
    }
}

private enum class MainTab(val label: String, val icon: ImageVector) {
    Products("제품", Icons.Outlined.Inventory2),
    Record("기록", Icons.Outlined.EditNote),
    Analysis("분석", Icons.Outlined.Analytics),
    Settings("설정", Icons.Outlined.Settings)
}

@Composable
private fun ProductsTab(
    accessToken: String,
    message: String?
) {
    Column(
        modifier = Modifier
            .fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(SkinSpacing.Item)
    ) {
        message?.let {
            Text(
                text = it,
                modifier = Modifier.padding(horizontal = SkinSpacing.Screen, vertical = SkinSpacing.Compact)
            )
        }
        ProductRegistrationRoute(accessToken = accessToken)
    }
}

@Composable
private fun SettingsTab(
    accessToken: String,
    onSignOut: () -> Unit
) {
    var isRetakingSkinTypeSurvey by remember { mutableStateOf(false) }

    if (isRetakingSkinTypeSurvey) {
        SkinTypeSurveyRoute(
            accessToken = accessToken,
            onCompleted = { isRetakingSkinTypeSurvey = false }
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SectionHeader(
            title = "설정",
            description = "지역, 기록 알림, 앱 사용 환경을 관리합니다.",
            modifier = Modifier.padding(horizontal = SkinSpacing.Screen)
        )
        LocationSettingsRoute(accessToken = accessToken)
        RecordReminderSettingsRoute()
        OutlinedButton(
            onClick = { isRetakingSkinTypeSurvey = true },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = SkinSpacing.Screen, vertical = SkinSpacing.Compact)
        ) {
            Text("초기 설문 다시 하기")
        }
        OutlinedButton(
            onClick = onSignOut,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = SkinSpacing.Screen, vertical = SkinSpacing.Compact)
        ) {
            Text("로그아웃")
        }
    }
}
