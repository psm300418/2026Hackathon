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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.feature.onboarding.SkinTypeSurveyRoute
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

            if (uiState.isAuthenticated) {
                SignedInContent(
                    backendProfileVerified = uiState.backendProfileVerified,
                    message = uiState.message,
                    onSignOut = onSignOut
                )
            } else {
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
    backendProfileVerified: Boolean,
    message: String?,
    onSignOut: () -> Unit
) {
    Text(
        text = if (backendProfileVerified) {
            "백엔드 보호 API 연결이 확인되었습니다."
        } else {
            "로그인 세션을 확인했습니다."
        },
        style = MaterialTheme.typography.titleMedium
    )

    message?.let {
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = it, style = MaterialTheme.typography.bodyMedium)
    }

    Spacer(modifier = Modifier.height(20.dp))

    OutlinedButton(
        onClick = onSignOut,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text("로그아웃")
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
