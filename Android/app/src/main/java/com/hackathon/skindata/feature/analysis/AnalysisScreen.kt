package com.hackathon.skindata.feature.analysis

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.core.designsystem.AppCard
import com.hackathon.skindata.core.designsystem.SectionHeader
import com.hackathon.skindata.core.designsystem.SkinColors
import com.hackathon.skindata.core.designsystem.SkinPrimaryButton as Button
import com.hackathon.skindata.core.network.AnalysisFindingDto
import com.hackathon.skindata.core.network.AnalysisNotableEventDto
import com.hackathon.skindata.core.network.AnalysisResultDto
import com.hackathon.skindata.core.network.AnalysisTrendPointDto
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
            .padding(horizontal = 22.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    SectionHeader(
                        title = "분석",
                        description = "최근 30일 기록과 누적 통계를 바탕으로 의심 성분 후보를 좁힙니다."
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
                KeyInsightsCard(analysis = analysis)
            }

            item {
                AnalysisSummaryCard(analysis = analysis)
            }

            if (analysis.trendPoints.isNotEmpty()) {
                item {
                    TrendChartCard(points = analysis.trendPoints)
                }
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

            if (analysis.notableEvents.isNotEmpty()) {
                item {
                    Text(text = "눈에 띈 변화", style = MaterialTheme.typography.titleMedium)
                }
                items(analysis.notableEvents, key = { it.date }) { event ->
                    NotableEventCard(event = event)
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
private fun KeyInsightsCard(analysis: AnalysisResultDto) {
    val insights = buildKeyInsights(analysis)

    AppCard(containerColor = SkinColors.Surface) {
        Text(text = "이번 분석의 핵심 3개", style = MaterialTheme.typography.titleMedium)
        insights.forEachIndexed { index, insight ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "${index + 1}",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = insight,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

@Composable
private fun TrendChartCard(points: List<AnalysisTrendPointDto>) {
    val maxScore = 20f
    val latestPoint = points.maxByOrNull { it.date }

    AppCard(containerColor = SkinColors.Surface) {
        Text(text = "최근 30일 피부 점수", style = MaterialTheme.typography.titleMedium)
        Text(
            text = "점수가 낮을수록 건조함, 유분, 붉음, 트러블 기록이 두드러진 날입니다.",
            style = MaterialTheme.typography.bodySmall,
            color = SkinColors.TextSecondary
        )
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
        ) {
            if (points.size < 2) {
                return@Canvas
            }

            val horizontalGap = size.width / (points.size - 1).coerceAtLeast(1)
            val path = Path()
            points.forEachIndexed { index, point ->
                val x = horizontalGap * index
                val y = size.height - (point.totalScore.toFloat().coerceIn(0f, maxScore) / maxScore) * size.height
                if (index == 0) {
                    path.moveTo(x, y)
                } else {
                    path.lineTo(x, y)
                }
            }
            drawLine(
                color = SkinColors.Border,
                start = Offset(0f, size.height * 0.5f),
                end = Offset(size.width, size.height * 0.5f),
                strokeWidth = 1.dp.toPx()
            )
            drawPath(
                path = path,
                color = SkinColors.Ink,
                style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round)
            )
            points.forEachIndexed { index, point ->
                val x = horizontalGap * index
                val y = size.height - (point.totalScore.toFloat().coerceIn(0f, maxScore) / maxScore) * size.height
                drawCircle(
                    color = if (point.totalScore <= 8) SkinColors.PrimaryOlive else SkinColors.Muted,
                    radius = 3.5.dp.toPx(),
                    center = Offset(x, y)
                )
            }
        }
        latestPoint?.let {
            Text(
                text = "최근 기록 ${it.date}: 총점 ${formatNumber(it.totalScore)}점",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun NotableEventCard(event: AnalysisNotableEventDto) {
    AppCard(containerColor = SkinColors.Surface) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = event.date,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold
            )
            AssistChip(
                onClick = {},
                label = { Text(if (event.severity == "high") "변화 큼" else "변화 있음") }
            )
        }
        Text(text = event.title, style = MaterialTheme.typography.titleMedium)
        Text(
            text = "최근 평균보다 -${formatNumber(event.scoreDelta)}점",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold
        )
        event.reasons.forEach { reason ->
            Text(text = "- $reason", style = MaterialTheme.typography.bodySmall)
        }
        if (event.factorTags.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                event.factorTags.take(3).forEach { tag ->
                    AssistChip(onClick = {}, label = { Text(factorTagLabel(tag)) })
                }
            }
        }
    }
}

@Composable
private fun EmptyAnalysisCard() {
    AppCard {
        Text(text = "분석 결과 없음", style = MaterialTheme.typography.titleMedium)
        Text(
            text = "오늘 기록이 쌓이면 분석하기 버튼으로 새 분석을 만들 수 있습니다.",
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun AnalysisSummaryCard(analysis: AnalysisResultDto) {
    AppCard {
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
        Text(text = "AI 분석 요약", style = MaterialTheme.typography.titleMedium)
        Text(text = analysis.summary, style = MaterialTheme.typography.bodyLarge)
        Text(
            text = "분석 결과는 진단이나 원인 확정이 아니라 기록 기반 관련 가능성입니다.",
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun FindingCard(finding: AnalysisFindingDto) {
    AppCard(containerColor = SkinColors.Surface) {
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
        Text(text = finding.reason, style = MaterialTheme.typography.bodyMedium)
        finding.supportingLogs.takeIf { it.isNotEmpty() }?.let { logs ->
            logs.forEach { log ->
                Text(text = "- $log", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun TextListCard(
    title: String,
    values: List<String>
) {
    AppCard {
        Text(text = title, style = MaterialTheme.typography.titleMedium)
        if (values.isEmpty()) {
            Text(text = "표시할 내용이 없습니다.", style = MaterialTheme.typography.bodyMedium)
        } else {
            values.forEach { value ->
                Text(text = "- $value", style = MaterialTheme.typography.bodySmall)
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

private fun formatNumber(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else String.format("%.1f", value)

private fun factorTagLabel(value: String): String =
    when (value) {
        "low_sleep" -> "수면 부족"
        "high_humidity" -> "높은 습도"
        "low_humidity" -> "낮은 습도"
        "high_temperature" -> "높은 기온"
        "long_outdoor" -> "긴 외출"
        "rain" -> "강수"
        "first_product_use" -> "첫 사용 제품"
        "product_change" -> "제품 변화"
        else -> value
    }

private fun buildKeyInsights(analysis: AnalysisResultDto): List<String> {
    val summaryInsight = analysis.summary
        .split(".", "。", "!")
        .firstOrNull { it.isNotBlank() }
        ?.trim()
        ?: "기록 기반 분석 요약을 확인해보세요."
    val eventInsight = analysis.notableEvents.maxByOrNull { it.scoreDelta }
        ?.let { event ->
            "${event.date} ${event.title}: ${event.reasons.firstOrNull() ?: "평소와 다른 변화가 있었습니다."}"
        }
        ?: "눈에 띄는 변화는 아직 충분히 모이지 않았습니다."
    val candidateInsight = when {
        analysis.positiveSuspectedIngredients.isNotEmpty() && analysis.negativeSuspectedIngredients.isNotEmpty() ->
            "긍정 후보 ${analysis.positiveSuspectedIngredients.first().name}, 부정 후보 ${analysis.negativeSuspectedIngredients.first().name}을 우선 확인하세요."
        analysis.positiveSuspectedIngredients.isNotEmpty() ->
            "긍정 후보 ${analysis.positiveSuspectedIngredients.first().name}의 반복 노출을 더 기록해보세요."
        analysis.negativeSuspectedIngredients.isNotEmpty() ->
            "부정 후보 ${analysis.negativeSuspectedIngredients.first().name}의 사용일 변화를 확인해보세요."
        else ->
            "성분 후보를 좁히려면 제품을 바꾼 날과 쉬는 날 기록이 더 필요합니다."
    }

    return listOf(summaryInsight, eventInsight, candidateInsight)
}

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
                    trendPoints = listOf(
                        AnalysisTrendPointDto("2026-08-15", 13.0, 2.0, 2.0, 2.0, 1.0, 7.0),
                        AnalysisTrendPointDto("2026-08-16", 4.0, 3.0, 4.0, 4.0, 5.0, 5.2),
                        AnalysisTrendPointDto("2026-08-17", 12.0, 2.0, 2.0, 2.0, 2.0, 7.3)
                    ),
                    notableEvents = listOf(
                        AnalysisNotableEventDto(
                            date = "2026-08-16",
                            title = "트러블이 평소보다 두드러진 날",
                            severity = "high",
                            totalScore = 4.0,
                            baselineScore = 12.0,
                            scoreDelta = 8.0,
                            factorTags = listOf("low_sleep", "high_humidity"),
                            reasons = listOf("수면 시간이 5.2시간으로 짧았습니다.", "습도가 84%로 높았습니다.")
                        )
                    ),
                    factorSummaries = emptyList(),
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
