package com.hackathon.skindata.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hackathon.skindata.BuildConfig
import com.hackathon.skindata.core.network.BackendApiClient
import com.hackathon.skindata.core.network.SupabaseProvider
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AuthViewModel(
    private val backendApiClient: BackendApiClient = BackendApiClient()
) : ViewModel() {
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun onEmailChanged(value: String) {
        _uiState.update { it.copy(email = value, message = null) }
    }

    fun onPasswordChanged(value: String) {
        _uiState.update { it.copy(password = value, message = null) }
    }

    fun signIn() {
        authenticate(isSignUp = false)
    }

    fun signUp() {
        authenticate(isSignUp = true)
    }

    fun demoLogin() {
        _uiState.update {
            it.copy(
                email = BuildConfig.DEMO_USER_EMAIL,
                password = BuildConfig.DEMO_USER_PASSWORD,
                message = null
            )
        }
        authenticate(isSignUp = false)
    }

    fun signOut() {
        viewModelScope.launch {
            runCatching {
                SupabaseProvider.client.auth.signOut()
            }

            _uiState.value = AuthUiState(
                message = "로그아웃되었습니다."
            )
        }
    }

    private fun authenticate(isSignUp: Boolean) {
        val currentState = _uiState.value
        val email = currentState.email.trim()
        val password = currentState.password

        if (email.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(message = "이메일과 비밀번호를 입력해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, message = null) }

            runCatching {
                if (isSignUp) {
                    SupabaseProvider.client.auth.signUpWith(Email) {
                        this.email = email
                        this.password = password
                    }
                } else {
                    SupabaseProvider.client.auth.signInWith(Email) {
                        this.email = email
                        this.password = password
                    }
                }

                val accessToken = SupabaseProvider.client.auth.currentAccessTokenOrNull()
                    ?: error("로그인 세션을 확인할 수 없습니다.")
                val profile = backendApiClient.getMyProfile(accessToken)

                accessToken to profile.skinTypeCompletedAt
            }.onSuccess { (accessToken, skinTypeCompletedAt) ->
                _uiState.update { state ->
                    state.copy(
                        accessToken = accessToken,
                        isLoading = false,
                        isAuthenticated = true,
                        backendProfileVerified = true,
                        skinTypeCompletedAt = skinTypeCompletedAt,
                        message = "로그인되었습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isAuthenticated = false,
                        backendProfileVerified = false,
                        accessToken = null,
                        skinTypeCompletedAt = null,
                        message = error.message ?: "로그인에 실패했습니다."
                    )
                }
            }
        }
    }

    fun markSkinTypeCompleted(completedAt: String) {
        _uiState.update {
            it.copy(
                skinTypeCompletedAt = completedAt,
                message = "초기 피부 타입 기준점이 저장되었습니다."
            )
        }
    }
}
