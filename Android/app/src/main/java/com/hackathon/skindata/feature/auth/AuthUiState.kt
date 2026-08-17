package com.hackathon.skindata.feature.auth

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val accessToken: String? = null,
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val backendProfileVerified: Boolean = false,
    val skinTypeCompletedAt: String? = null,
    val message: String? = null
) {
    val needsSkinTypeSurvey: Boolean
        get() = isAuthenticated && skinTypeCompletedAt == null
}
