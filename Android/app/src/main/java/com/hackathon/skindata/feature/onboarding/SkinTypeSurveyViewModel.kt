package com.hackathon.skindata.feature.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hackathon.skindata.core.network.BackendApiClient
import com.hackathon.skindata.core.network.SkinTypeResponseInput
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class SkinTypeSurveyViewModel(
    private val backendApiClient: BackendApiClient = BackendApiClient()
) : ViewModel() {
    private val _uiState = MutableStateFlow(SkinTypeSurveyUiState(isLoading = true))
    val uiState: StateFlow<SkinTypeSurveyUiState> = _uiState.asStateFlow()

    init {
        loadQuestions()
    }

    fun selectOption(questionId: String, optionId: String) {
        _uiState.update {
            it.copy(
                selectedOptionByQuestionId = it.selectedOptionByQuestionId + (questionId to optionId),
                message = null
            )
        }
    }

    fun moveToSection(index: Int) {
        _uiState.update {
            val sectionCount = it.questions?.sections?.size ?: 0
            val nextIndex = index.coerceIn(0, (sectionCount - 1).coerceAtLeast(0))
            it.copy(currentSectionIndex = nextIndex)
        }
    }

    fun submit(accessToken: String, onCompleted: (String) -> Unit) {
        val currentState = _uiState.value
        val questions = currentState.questions

        if (questions == null) {
            _uiState.update { it.copy(message = "설문 문항을 불러오지 못했습니다.") }
            return
        }

        if (!currentState.canSubmit) {
            _uiState.update { it.copy(message = "모든 문항에 응답해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, message = null) }

            runCatching {
                val responses = questions.sections.flatMap { section ->
                    section.questions.map { question ->
                        SkinTypeResponseInput(
                            questionId = question.id,
                            optionId = currentState.selectedOptionByQuestionId.getValue(question.id)
                        )
                    }
                }

                backendApiClient.submitSkinTypeResponses(
                    accessToken = accessToken,
                    questionnaireVersion = questions.version,
                    responses = responses
                )
            }.onSuccess { result ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        result = result,
                        message = null
                    )
                }
                onCompleted(result.completedAt)
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = error.message ?: "설문 저장에 실패했습니다."
                    )
                }
            }
        }
    }

    private fun loadQuestions() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, message = null) }

            runCatching {
                backendApiClient.getSkinTypeQuestions()
            }.onSuccess { questions ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        questions = questions,
                        message = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = error.message ?: "설문 문항을 불러오지 못했습니다."
                    )
                }
            }
        }
    }
}
