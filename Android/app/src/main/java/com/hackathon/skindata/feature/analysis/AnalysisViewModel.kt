package com.hackathon.skindata.feature.analysis

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hackathon.skindata.core.network.BackendApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AnalysisViewModel(
    private val backendApiClient: BackendApiClient = BackendApiClient()
) : ViewModel() {
    private val _uiState = MutableStateFlow(AnalysisUiState())
    val uiState: StateFlow<AnalysisUiState> = _uiState.asStateFlow()

    fun load(accessToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, message = null) }

            runCatching {
                backendApiClient.getLatestAnalysis(accessToken)
            }.onSuccess { analysis ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        latestAnalysis = analysis,
                        message = if (analysis == null) "아직 생성된 분석이 없습니다." else null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = error.message ?: "분석 결과를 불러오지 못했습니다."
                    )
                }
            }
        }
    }

    fun run(accessToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isRunning = true, message = null) }

            runCatching {
                backendApiClient.runAnalysis(accessToken)
            }.onSuccess { analysis ->
                _uiState.update {
                    it.copy(
                        isRunning = false,
                        latestAnalysis = analysis,
                        message = "새 분석을 생성했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isRunning = false,
                        message = error.message ?: "분석 생성에 실패했습니다."
                    )
                }
            }
        }
    }
}
