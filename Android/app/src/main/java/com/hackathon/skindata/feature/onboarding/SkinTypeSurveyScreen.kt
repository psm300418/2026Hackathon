package com.hackathon.skindata.feature.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.core.network.SkinTypeDimensionResultDto
import com.hackathon.skindata.core.network.SkinTypeDimensionsDto
import com.hackathon.skindata.core.network.SkinTypeOptionDto
import com.hackathon.skindata.core.network.SkinTypeQuestionDto
import com.hackathon.skindata.core.network.SkinTypeQuestionsDto
import com.hackathon.skindata.core.network.SkinTypeResultDto
import com.hackathon.skindata.core.network.SkinTypeSectionDto
import com.hackathon.skindata.ui.theme.SkinDataTheme

@Composable
fun SkinTypeSurveyRoute(
    accessToken: String,
    onCompleted: (String) -> Unit,
    viewModel: SkinTypeSurveyViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    SkinTypeSurveyScreen(
        uiState = uiState,
        onSelectOption = viewModel::selectOption,
        onMoveToSection = viewModel::moveToSection,
        onSubmit = { viewModel.submit(accessToken, onCompleted) }
    )
}

@Composable
fun SkinTypeSurveyScreen(
    uiState: SkinTypeSurveyUiState,
    onSelectOption: (String, String) -> Unit,
    onMoveToSection: (Int) -> Unit,
    onSubmit: () -> Unit
) {
    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text(
                text = "초기 피부 타입 기준점",
                style = MaterialTheme.typography.headlineSmall
            )
            Text(
                text = "결과는 의료 진단이 아니라 이후 기록 분석을 위한 시작점입니다.",
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (uiState.isLoading) {
                CircularProgressIndicator()
                return@Column
            }

            uiState.result?.let { result ->
                ResultContent(result = result)
                return@Column
            }

            val questions = uiState.questions

            if (questions == null) {
                Text(text = uiState.message ?: "설문 문항이 없습니다.")
                return@Column
            }

            val section = questions.sections[uiState.currentSectionIndex]
            val progress = if (uiState.totalQuestions == 0) {
                0f
            } else {
                uiState.answeredQuestions.toFloat() / uiState.totalQuestions.toFloat()
            }

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "${uiState.answeredQuestions}/${uiState.totalQuestions} 문항 완료",
                style = MaterialTheme.typography.bodySmall
            )

            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = section.title,
                style = MaterialTheme.typography.titleLarge
            )

            Spacer(modifier = Modifier.height(12.dp))

            section.questions.forEach { question ->
                QuestionCard(
                    question = question,
                    selectedOptionId = uiState.selectedOptionByQuestionId[question.id],
                    onSelectOption = onSelectOption
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            uiState.message?.let {
                Text(text = it, style = MaterialTheme.typography.bodyMedium)
                Spacer(modifier = Modifier.height(12.dp))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = { onMoveToSection(uiState.currentSectionIndex - 1) },
                    modifier = Modifier.weight(1f),
                    enabled = uiState.currentSectionIndex > 0
                ) {
                    Text("이전")
                }
                Button(
                    onClick = {
                        if (uiState.currentSectionIndex == questions.sections.lastIndex) {
                            onSubmit()
                        } else {
                            onMoveToSection(uiState.currentSectionIndex + 1)
                        }
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text(if (uiState.currentSectionIndex == questions.sections.lastIndex) "결과 보기" else "다음")
                }
            }
        }
    }
}

@Composable
private fun QuestionCard(
    question: SkinTypeQuestionDto,
    selectedOptionId: String?,
    onSelectOption: (String, String) -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(text = question.text, style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))

            question.options.forEach { option ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    RadioButton(
                        selected = selectedOptionId == option.id,
                        onClick = { onSelectOption(question.id, option.id) }
                    )
                    Text(
                        text = option.text,
                        modifier = Modifier
                            .weight(1f)
                            .padding(top = 12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }
}

@Composable
private fun ResultContent(result: SkinTypeResultDto) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "피부 타입 기준점", style = MaterialTheme.typography.titleLarge)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = result.displayName, style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = "유분/건조: ${result.dimensions.oilDry.label}")
            Text(text = "민감/저항: ${result.dimensions.sensitiveResistant.label}")
            Text(text = "색소침착: ${result.dimensions.pigmentedNonPigmented.label}")
            Text(text = "주름/탄력: ${result.dimensions.wrinkledTight.label}")
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = result.notice, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun SkinTypeSurveyScreenPreview() {
    SkinDataTheme {
        SkinTypeSurveyScreen(
            uiState = SkinTypeSurveyUiState(
                questions = SkinTypeQuestionsDto(
                    version = "baumann_ko_rewrite_v1",
                    title = "초기 피부 타입 설문",
                    sections = listOf(
                        SkinTypeSectionDto(
                            dimension = "oil_dry",
                            title = "피부의 유분/건조 정도",
                            questions = listOf(
                                SkinTypeQuestionDto(
                                    id = "OD_01",
                                    text = "세안 후 피부가 어떤가요?",
                                    options = listOf(
                                        SkinTypeOptionDto("A", "매우 건조해요."),
                                        SkinTypeOptionDto("B", "약간 건조해요.")
                                    )
                                )
                            )
                        )
                    )
                ),
                result = SkinTypeResultDto(
                    skinTypeCode = "OSNT",
                    displayName = "지성 경향 · 민감성 경향 · 비색소성 경향 · 탄력 유지 경향",
                    dimensions = SkinTypeDimensionsDto(
                        oilDry = SkinTypeDimensionResultDto("O", "지성 경향", 31.0),
                        sensitiveResistant = SkinTypeDimensionResultDto("S", "민감성 경향", 32.0),
                        pigmentedNonPigmented = SkinTypeDimensionResultDto("N", "비색소성 경향", 24.0),
                        wrinkledTight = SkinTypeDimensionResultDto("T", "탄력 유지 경향", 34.0)
                    ),
                    notice = "이 결과는 의료 진단이 아니라 이후 기록 분석을 위한 초기 기준점입니다.",
                    completedAt = "2026-08-17T08:00:00.000Z"
                )
            ),
            onSelectOption = { _, _ -> },
            onMoveToSection = {},
            onSubmit = {}
        )
    }
}
