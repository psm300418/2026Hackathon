package com.hackathon.skindata.feature.onboarding

import com.hackathon.skindata.core.network.SkinTypeQuestionsDto
import com.hackathon.skindata.core.network.SkinTypeResultDto

data class SkinTypeSurveyUiState(
    val isLoading: Boolean = false,
    val questions: SkinTypeQuestionsDto? = null,
    val selectedOptionByQuestionId: Map<String, String> = emptyMap(),
    val currentSectionIndex: Int = 0,
    val result: SkinTypeResultDto? = null,
    val message: String? = null
) {
    val totalQuestions: Int
        get() = questions?.sections?.sumOf { it.questions.size } ?: 0

    val answeredQuestions: Int
        get() = selectedOptionByQuestionId.size

    val canSubmit: Boolean
        get() = totalQuestions > 0 && answeredQuestions == totalQuestions && !isLoading
}
