package com.hackathon.skindata.feature.main

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.hackathon.skindata.core.designsystem.InfoCard
import com.hackathon.skindata.core.designsystem.SectionHeader
import com.hackathon.skindata.core.designsystem.SkinSpacing
import com.hackathon.skindata.feature.analysis.AnalysisRoute
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
    var selectedTab by remember { mutableStateOf(MainTab.Home) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                MainTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Text(tab.icon) },
                        label = { Text(tab.label) }
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
                MainTab.Home -> HomeTab(
                    backendProfileVerified = backendProfileVerified,
                    message = message
                )
                MainTab.Products -> ProductsTab()
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

private enum class MainTab(val label: String, val icon: String) {
    Home("홈", "홈"),
    Products("제품", "제품"),
    Record("기록", "기록"),
    Analysis("분석", "분석"),
    Settings("설정", "설정")
}

@Composable
private fun HomeTab(
    backendProfileVerified: Boolean,
    message: String?
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(SkinSpacing.Screen),
        verticalArrangement = Arrangement.spacedBy(SkinSpacing.Item)
    ) {
        SectionHeader(title = "홈")
        InfoCard(
            title = if (backendProfileVerified) {
                "기록 준비 완료"
            } else {
                "로그인 세션 확인"
            },
            body = if (backendProfileVerified) {
                "초기 피부 타입 기준점과 로그인 상태가 준비되었습니다."
            } else {
                "로그인 세션은 확인했지만 프로필 동기화 상태를 다시 확인해야 합니다."
            }
        )
        message?.let {
            Text(text = it)
        }
    }
}

@Composable
private fun ProductsTab() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(SkinSpacing.Screen),
        verticalArrangement = Arrangement.spacedBy(SkinSpacing.Item)
    ) {
        SectionHeader(title = "제품")
        InfoCard(
            title = "제품 관리는 설정에서",
            body = "이전 사용 제품과 성분표 사진 기반 직접 등록은 설정 탭에서 관리합니다."
        )
    }
}

@Composable
private fun SettingsTab(
    accessToken: String,
    onSignOut: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
    ) {
        LocationSettingsRoute(accessToken = accessToken)
        RecordReminderSettingsRoute()
        ProductRegistrationRoute(
            accessToken = accessToken,
            modifier = Modifier.weight(1f)
        )
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
