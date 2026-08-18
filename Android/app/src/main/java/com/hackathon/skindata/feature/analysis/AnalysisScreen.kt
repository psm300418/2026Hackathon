package com.hackathon.skindata.feature.analysis

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.core.network.AnalysisFindingDto
import com.hackathon.skindata.core.network.AnalysisResultDto
import com.hackathon.skindata.ui.theme.SkinDataTheme

@Composable
fun AnalysisRoute(
    accessToken: String,
    viewModel: AnalysisViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(accessToken) {
        viewModel.load(accessToken)
    }

    AnalysisScreen(
        uiState = uiState,
        onRunAnalysis = { viewModel.run(accessToken) }
    )
}

@Composable
fun AnalysisScreen(
    uiState: AnalysisUiState,
    onRunAnalysis: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = "분석", style = MaterialTheme.typography.headlineSmall)
                    Text(
                        text = "최근 30일 기록과 누적 통계를 바탕으로 의심 성분 후보를 좁힙니다.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Button(
                    onClick = onRunAnalysis,
                    enabled = !uiState.isRunning && !uiState.isLoading
                ) {
                    Text(if (uiState.isRunning) "분석 중" else "분석하기")
                }
            }
        }

        if (uiState.isLoading || uiState.isRunning) {
            item { CircularProgressIndicator() }
        }

        uiState.message?.let {
            item {
                Text(text = it, style = MaterialTheme.typography.bodyMedium)
            }
        }

        val analysis = uiState.latestAnalysis
        if (analysis == null) {
            item {
                EmptyAnalysisCard()
            }
        } else {
            item {
                AnalysisSummaryCard(analysis = analysis)
            }

            item {
                Text(text = "긍정적 의심 성분 후보", style = MaterialTheme.typography.titleMedium)
            }
            if (analysis.positiveSuspectedIngredients.isEmpty()) {
                item { Text(text = "아직 표시할 후보가 없습니다.", style = MaterialTheme.typography.bodyMedium) }
            } else {
                items(analysis.positiveSuspectedIngredients, key = { it.id }) { finding ->
                    FindingCard(finding = finding)
                }
            }

            item {
                Text(text = "부정적 의심 성분 후보", style = MaterialTheme.typography.titleMedium)
            }
            if (analysis.negativeSuspectedIngredients.isEmpty()) {
                item { Text(text = "아직 표시할 후보가 없습니다.", style = MaterialTheme.typography.bodyMedium) }
            } else {
                items(analysis.negativeSuspectedIngredients, key = { it.id }) { finding ->
                    FindingCard(finding = finding)
                }
            }

            item {
                TextListCard(title = "분석 제한점", values = analysis.limitations)
            }

            item {
                TextListCard(title = "다음에 기록하면 좋은 항목", values = analysis.nextRecordsToAdd)
            }
        }
    }
}

@Composable
private fun EmptyAnalysisCard() {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "분석 결과 없음", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "오늘 기록이 쌓이면 분석하기 버튼으로 새 분석을 만들 수 있습니다.",
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun AnalysisSummaryCard(analysis: AnalysisResultDto) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(
                    onClick = {},
                    label = { Text(confidenceLabel(analysis.confidenceLevel)) }
                )
                AssistChip(
                    onClick = {},
                    label = { Text(dateLabel(analysis.requestedAt)) }
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = analysis.summary, style = MaterialTheme.typography.bodyLarge)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "분석 결과는 진단이나 원인 확정이 아니라 기록 기반 관련 가능성입니다.",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun FindingCard(finding: AnalysisFindingDto) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = finding.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                AssistChip(
                    onClick = {},
                    label = { Text(confidenceLabel(finding.evidenceLevel)) }
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = finding.reason, style = MaterialTheme.typography.bodyMedium)
            finding.supportingLogs.takeIf { it.isNotEmpty() }?.let { logs ->
                Spacer(modifier = Modifier.height(8.dp))
                logs.forEach { log ->
                    Text(text = "- $log", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun TextListCard(
    title: String,
    values: List<String>
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(6.dp))
            if (values.isEmpty()) {
                Text(text = "표시할 내용이 없습니다.", style = MaterialTheme.typography.bodyMedium)
            } else {
                values.forEach { value ->
                    Text(text = "- $value", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

private fun confidenceLabel(value: String): String =
    when (value) {
        "strong" -> "근거 강함"
        "medium" -> "근거 중간"
        "weak" -> "근거 약함"
        else -> "데이터 부족"
    }

private fun dateLabel(value: String): String =
    value.take(10).takeIf { it.length == 10 } ?: value

@Preview(showBackground = true)
@Composable
private fun AnalysisScreenPreview() {
    SkinDataTheme {
        AnalysisScreen(
            uiState = AnalysisUiState(
                isLoading = false,
                latestAnalysis = AnalysisResultDto(
                    analysisRunId = "preview",
                    requestedAt = "2026-08-18T09:00:00.000Z",
                    confidenceLevel = "weak",
                    summary = "기록 수가 적어 낮은 신뢰도로 관련 가능성을 표시합니다.",
                    positiveSuspectedIngredients = emptyList(),
                    negativeSuspectedIngredients = emptyList(),
                    limitations = listOf("기록 기간이 짧습니다."),
                    nextRecordsToAdd = listOf("제품을 사용하지 않은 날의 피부 상태")
                )
            ),
            onRunAnalysis = {}
        )
    }
}
