package com.hackathon.skindata.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.feature.onboarding.SkinTypeSurveyRoute
import com.hackathon.skindata.feature.products.ProductRegistrationRoute
import com.hackathon.skindata.feature.records.DailyRecordRoute
import com.hackathon.skindata.ui.theme.SkinDataTheme

@Composable
fun AuthRoute(
    viewModel: AuthViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    AuthScreen(
        uiState = uiState,
        onEmailChanged = viewModel::onEmailChanged,
        onPasswordChanged = viewModel::onPasswordChanged,
        onSignIn = viewModel::signIn,
        onSignUp = viewModel::signUp,
        onDemoLogin = viewModel::demoLogin,
        onSignOut = viewModel::signOut,
        onSkinTypeCompleted = viewModel::markSkinTypeCompleted
    )
}

@Composable
fun AuthScreen(
    uiState: AuthUiState,
    onEmailChanged: (String) -> Unit,
    onPasswordChanged: (String) -> Unit,
    onSignIn: () -> Unit,
    onSignUp: () -> Unit,
    onDemoLogin: () -> Unit,
    onSignOut: () -> Unit,
    onSkinTypeCompleted: (String) -> Unit
) {
    if (uiState.needsSkinTypeSurvey && uiState.accessToken != null) {
        SkinTypeSurveyRoute(
            accessToken = uiState.accessToken,
            onCompleted = onSkinTypeCompleted
        )
        return
    }

    if (uiState.isAuthenticated) {
        SignedInContent(
            accessToken = uiState.accessToken,
            backendProfileVerified = uiState.backendProfileVerified,
            message = uiState.message,
            onSignOut = onSignOut
        )
        return
    }

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Personal Skin Data",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "기록을 바탕으로 피부 반응 후보를 좁혀보세요.",
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(28.dp))

            SignedOutContent(
                uiState = uiState,
                onEmailChanged = onEmailChanged,
                onPasswordChanged = onPasswordChanged,
                onSignIn = onSignIn,
                onSignUp = onSignUp,
                onDemoLogin = onDemoLogin
            )
        }
    }
}

@Composable
private fun SignedOutContent(
    uiState: AuthUiState,
    onEmailChanged: (String) -> Unit,
    onPasswordChanged: (String) -> Unit,
    onSignIn: () -> Unit,
    onSignUp: () -> Unit,
    onDemoLogin: () -> Unit
) {
    OutlinedTextField(
        value = uiState.email,
        onValueChange = onEmailChanged,
        modifier = Modifier.fillMaxWidth(),
        label = { Text("이메일") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        enabled = !uiState.isLoading
    )

    Spacer(modifier = Modifier.height(12.dp))

    OutlinedTextField(
        value = uiState.password,
        onValueChange = onPasswordChanged,
        modifier = Modifier.fillMaxWidth(),
        label = { Text("비밀번호") },
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        enabled = !uiState.isLoading
    )

    Spacer(modifier = Modifier.height(20.dp))

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Button(
            onClick = onSignIn,
            modifier = Modifier.weight(1f),
            enabled = !uiState.isLoading
        ) {
            Text("로그인")
        }
        OutlinedButton(
            onClick = onSignUp,
            modifier = Modifier.weight(1f),
            enabled = !uiState.isLoading
        ) {
            Text("회원가입")
        }
    }

    Spacer(modifier = Modifier.height(10.dp))

    OutlinedButton(
        onClick = onDemoLogin,
        modifier = Modifier.fillMaxWidth(),
        enabled = !uiState.isLoading
    ) {
        Text("Demo Login")
    }

    StatusMessage(uiState = uiState)
}

@Composable
private fun SignedInContent(
    accessToken: String?,
    backendProfileVerified: Boolean,
    message: String?,
    onSignOut: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(MainTab.Home) }

    if (accessToken == null) {
        Text(text = "로그인 세션을 확인할 수 없습니다.")
        Spacer(modifier = Modifier.height(20.dp))
        OutlinedButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) {
            Text("로그아웃")
        }
        return
    }

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
                MainTab.Products -> PlaceholderTab(
                    title = "제품",
                    body = "설정 탭에서 이전 사용 제품을 먼저 등록할 수 있습니다."
                )
                MainTab.Record -> DailyRecordRoute(accessToken = accessToken)
                MainTab.Analysis -> PlaceholderTab(
                    title = "분석",
                    body = "저장한 기록이 쌓이면 긍정적/부정적 의심 성분 후보를 확인합니다."
                )
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
    Column(modifier = Modifier.padding(20.dp)) {
        Text(text = "홈", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = if (backendProfileVerified) {
                "로그인과 초기 피부 타입 기준점 저장이 완료되었습니다."
            } else {
                "로그인 세션을 확인했습니다."
            },
            style = MaterialTheme.typography.titleMedium
        )

        message?.let {
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = it, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun PlaceholderTab(
    title: String,
    body: String
) {
    Column(modifier = Modifier.padding(20.dp)) {
        Text(text = title, style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = body, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun SettingsTab(
    accessToken: String,
    onSignOut: () -> Unit
) {
    Column {
        ProductRegistrationRoute(accessToken = accessToken)
        OutlinedButton(
            onClick = onSignOut,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            Text("로그아웃")
        }
    }
}

@Composable
private fun StatusMessage(uiState: AuthUiState) {
    Spacer(modifier = Modifier.height(16.dp))

    if (uiState.isLoading) {
        CircularProgressIndicator(
            modifier = Modifier.padding(top = 4.dp)
        )
        return
    }

    uiState.message?.let {
        Text(
            text = it,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun AuthScreenPreview() {
    SkinDataTheme {
        AuthScreen(
            uiState = AuthUiState(email = "demo@example.com", password = "demo1234"),
            onEmailChanged = {},
            onPasswordChanged = {},
            onSignIn = {},
            onSignUp = {},
            onDemoLogin = {},
            onSignOut = {},
            onSkinTypeCompleted = {}
        )
    }
}
