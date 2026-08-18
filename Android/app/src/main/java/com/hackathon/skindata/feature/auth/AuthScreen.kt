package com.hackathon.skindata.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.core.designsystem.SkinOutlinedButton as OutlinedButton
import com.hackathon.skindata.core.designsystem.SkinPrimaryButton as Button
import com.hackathon.skindata.core.designsystem.AppTextField
import com.hackathon.skindata.core.designsystem.SkinColors
import com.hackathon.skindata.core.designsystem.SkinSpacing
import com.hackathon.skindata.feature.main.MainShellRoute
import com.hackathon.skindata.feature.onboarding.SkinTypeSurveyRoute

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
        val accessToken = uiState.accessToken

        if (accessToken == null) {
            MissingSessionContent(onSignOut = onSignOut)
        } else {
            MainShellRoute(
                accessToken = accessToken,
                backendProfileVerified = uiState.backendProfileVerified,
                message = uiState.message,
                onSignOut = onSignOut
            )
        }
        return
    }

    Scaffold { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(SkinColors.BackgroundWarm)
        ) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 58.dp, end = 28.dp)
                    .size(132.dp)
                    .aspectRatio(1f)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(SkinColors.PrimaryOliveSoft, SkinColors.Surface)
                        ),
                        shape = CircleShape
                    )
                    .blur(0.5.dp)
            )
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = SkinSpacing.Screen, vertical = 52.dp),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Personal\nSkin Data",
                    style = MaterialTheme.typography.headlineLarge
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = "기록을 바탕으로\n피부 반응 후보를 좁혀보세요.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = SkinColors.TextSecondary
                )

                Spacer(modifier = Modifier.height(54.dp))

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
    AppTextField(
        value = uiState.email,
        onValueChange = onEmailChanged,
        modifier = Modifier.fillMaxWidth(),
        label = "이메일",
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        enabled = !uiState.isLoading
    )

    Spacer(modifier = Modifier.height(12.dp))

    AppTextField(
        value = uiState.password,
        onValueChange = onPasswordChanged,
        modifier = Modifier.fillMaxWidth(),
        label = "비밀번호",
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        enabled = !uiState.isLoading
    )

    Spacer(modifier = Modifier.height(20.dp))

    Button(
        onClick = onSignIn,
        modifier = Modifier.fillMaxWidth(),
        enabled = !uiState.isLoading
    ) {
        Text("로그인")
    }

    Spacer(modifier = Modifier.height(12.dp))

    OutlinedButton(
        onClick = onSignUp,
        modifier = Modifier.fillMaxWidth(),
        enabled = !uiState.isLoading
    ) {
        Text("회원가입")
    }

    Spacer(modifier = Modifier.height(30.dp))

    Text(
        text = "또는",
        modifier = Modifier.fillMaxWidth(),
        style = MaterialTheme.typography.bodySmall,
        color = SkinColors.Muted,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(18.dp))

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
private fun MissingSessionContent(
    onSignOut: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(SkinSpacing.Screen)
    ) {
        Text(text = "로그인 세션을 확인할 수 없습니다.")
        Spacer(modifier = Modifier.height(20.dp))
        OutlinedButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) {
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
