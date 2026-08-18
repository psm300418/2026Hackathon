package com.hackathon.skindata.feature.onboarding

import com.hackathon.skindata.core.network.SkinTypeQuestionsDto
import com.hackathon.skindata.core.network.SkinTypeResultDto

data class SkinTypeSurveyUiState(
    val isLoading: Boolean = false,
    val questions: SkinTypeQuestionsDto? = null,
    val selectedOptionByQuestionId: Map<String, String> = emptyMap(),
    val knownCodeByDimension: Map<String, String> = emptyMap(),
    val currentSectionIndex: Int = 0,
    val result: SkinTypeResultDto? = null,
    val message: String? = null
) {
    val activeSections
        get() = questions?.sections?.filterNot { knownCodeByDimension.containsKey(it.dimension) }
            ?: emptyList()

    val totalQuestions: Int
        get() = activeSections.sumOf { it.questions.size }

    val answeredQuestions: Int
        get() = activeSections.sumOf { section ->
            section.questions.count { selectedOptionByQuestionId.containsKey(it.id) }
        }

    val canSubmit: Boolean
        get() = questions != null && answeredQuestions == totalQuestions && !isLoading
}
