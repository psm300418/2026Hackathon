package com.hackathon.skindata.feature.records

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.core.designsystem.AppCard
import com.hackathon.skindata.core.designsystem.AppTextField
import com.hackathon.skindata.core.designsystem.SectionHeader
import com.hackathon.skindata.core.designsystem.SkinColors
import com.hackathon.skindata.core.designsystem.SkinOutlinedButton as OutlinedButton
import com.hackathon.skindata.core.designsystem.SkinPrimaryButton as Button
import com.hackathon.skindata.core.network.DailyRecordDto
import com.hackathon.skindata.core.network.DailyRecordEnvironmentDto
import com.hackathon.skindata.core.network.DailyRecordTrendsDto
import com.hackathon.skindata.core.network.FacePhotoUpload
import com.hackathon.skindata.core.network.ProductDto
import com.hackathon.skindata.core.network.UserProductDto
import com.hackathon.skindata.ui.theme.SkinDataTheme
import java.time.LocalDate

@Composable
fun DailyRecordRoute(
    accessToken: String,
    viewModel: DailyRecordViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(accessToken) {
        viewModel.load(accessToken)
    }

    DailyRecordScreen(
        uiState = uiState,
        onModeSelected = viewModel::selectMode,
        onScoreChanged = viewModel::updateScore,
        onSleepHoursChanged = viewModel::onSleepHoursChanged,
        onOutdoorMinutesChanged = viewModel::onOutdoorMinutesChanged,
        onMemoChanged = viewModel::onMemoChanged,
        onToggleProduct = viewModel::toggleUserProduct,
        onApplyPreset = viewModel::applyPreset,
        onPresetNameChanged = viewModel::onPresetNameChanged,
        onCreatePreset = { viewModel.createPreset(accessToken) },
        onProductSearchQueryChanged = viewModel::onProductSearchQueryChanged,
        onSearchProducts = viewModel::searchProducts,
        onAddProductToToday = { product -> viewModel.addProductToToday(accessToken, product) },
        onPhotoSelected = viewModel::setFacePhoto,
        onSave = { viewModel.saveToday(accessToken) }
    )
}

@Composable
fun DailyRecordScreen(
    uiState: DailyRecordUiState,
    onModeSelected: (DailyRecordMode) -> Unit,
    onScoreChanged: (ScoreKind, Int) -> Unit,
    onSleepHoursChanged: (String) -> Unit,
    onOutdoorMinutesChanged: (String) -> Unit,
    onMemoChanged: (String) -> Unit,
    onToggleProduct: (String) -> Unit,
    onApplyPreset: (String) -> Unit,
    onPresetNameChanged: (String) -> Unit,
    onCreatePreset: () -> Unit,
    onProductSearchQueryChanged: (String) -> Unit,
    onSearchProducts: () -> Unit,
    onAddProductToToday: (ProductDto) -> Unit,
    onPhotoSelected: (FacePhotoUpload?) -> Unit,
    onSave: () -> Unit
) {
    val context = LocalContext.current
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        onPhotoSelected(uri?.toFacePhotoUpload(context))
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            SectionHeader(
                title = "오늘의 피부 기록",
                description = "${uiState.recordDate} 기록은 하루 1개로 저장되고 다시 저장하면 갱신됩니다."
            )
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ModeButton(
                    label = "오늘",
                    selected = uiState.selectedMode == DailyRecordMode.Today,
                    onClick = { onModeSelected(DailyRecordMode.Today) }
                )
                ModeButton(
                    label = "기록",
                    selected = uiState.selectedMode == DailyRecordMode.History,
                    onClick = { onModeSelected(DailyRecordMode.History) }
                )
                ModeButton(
                    label = "추이",
                    selected = uiState.selectedMode == DailyRecordMode.Trends,
                    onClick = { onModeSelected(DailyRecordMode.Trends) }
                )
            }
        }

        if (uiState.isLoading) {
            item { CircularProgressIndicator() }
        }

        if (uiState.selectedMode == DailyRecordMode.Today) {
            item {
                AppCard(containerColor = SkinColors.Surface) {
                    Text(text = "피부 상태 체크", style = MaterialTheme.typography.titleMedium)
                    ScoreControl("건조함", ScoreKind.Dryness, uiState.dryness, onScoreChanged)
                    ScoreControl("유분", ScoreKind.Oiliness, uiState.oiliness, onScoreChanged)
                    ScoreControl("붉음", ScoreKind.Redness, uiState.redness, onScoreChanged)
                    ScoreControl("트러블", ScoreKind.Trouble, uiState.trouble, onScoreChanged)
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AppCard(modifier = Modifier.weight(1f), containerColor = SkinColors.Surface) {
                        AppTextField(
                            value = uiState.sleepHours,
                            onValueChange = onSleepHoursChanged,
                            label = "수면 시간",
                            singleLine = true
                        )
                    }
                    AppCard(modifier = Modifier.weight(1f), containerColor = SkinColors.Surface) {
                        AppTextField(
                            value = uiState.outdoorMinutes,
                            onValueChange = onOutdoorMinutesChanged,
                            label = "외출 시간(분)",
                            singleLine = true
                        )
                    }
                }
            }

            item {
                WeatherSummaryCard(
                    userLocationLabel = uiState.userLocation?.let {
                        "${it.regionLabel} · ${it.weatherStationName} 관측소"
                    },
                    environment = uiState.todayRecord?.environment
                )
            }

            item {
                Text(text = "프리셋", style = MaterialTheme.typography.titleMedium)
                if (uiState.presets.isEmpty()) {
                    Text(text = "저장된 프리셋이 없습니다.", style = MaterialTheme.typography.bodyMedium)
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        uiState.presets.take(3).forEach { preset ->
                            AssistChip(
                                onClick = { onApplyPreset(preset.id) },
                                label = { Text(preset.name) }
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AppTextField(
                        value = uiState.presetName,
                        onValueChange = onPresetNameChanged,
                        modifier = Modifier.weight(1f),
                        label = "새 프리셋 이름",
                        singleLine = true
                    )
                    OutlinedButton(
                        onClick = onCreatePreset,
                        enabled = !uiState.isSaving
                    ) {
                        Text("저장")
                    }
                }
            }

            item {
                Text(text = "오늘 사용한 제품", style = MaterialTheme.typography.titleMedium)
                if (uiState.userProducts.isEmpty()) {
                    Text(text = "아직 내 제품이 없습니다. 아래에서 제품을 검색해 추가할 수 있습니다.")
                }
            }

            items(uiState.userProducts, key = { it.id }) { userProduct ->
                UserProductSelectRow(
                    userProduct = userProduct,
                    selected = userProduct.id in uiState.selectedUserProductIds,
                    onClick = { onToggleProduct(userProduct.id) }
                )
            }

            item {
                Text(text = "제품 검색 후 바로 추가", style = MaterialTheme.typography.titleMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AppTextField(
                        value = uiState.productSearchQuery,
                        onValueChange = onProductSearchQueryChanged,
                        modifier = Modifier.weight(1f),
                        label = "제품명 또는 브랜드",
                        singleLine = true
                    )
                    Button(onClick = onSearchProducts, enabled = !uiState.isLoading) {
                        Text("검색")
                    }
                }
            }

            items(uiState.productSearchResults, key = { it.id }) { product ->
                SearchResultCard(product = product, onClick = { onAddProductToToday(product) })
            }

            item {
                AppTextField(
                    value = uiState.memo,
                    onValueChange = onMemoChanged,
                    modifier = Modifier.fillMaxWidth(),
                    label = "메모",
                    minLines = 2,
                    maxLines = 4
                )
            }

            item {
                AppCard(containerColor = SkinColors.Surface) {
                    Text(text = "얼굴 사진", style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = "선택 사항입니다. 사진 없이도 저장할 수 있습니다.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    OutlinedButton(onClick = { photoPicker.launch("image/*") }) {
                        Text(if (uiState.facePhoto == null) "사진 선택" else "사진 다시 선택")
                    }
                    uiState.facePhoto?.let {
                        Text(text = "${it.fileName} 선택됨", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            uiState.todayRecord?.let { record ->
                item {
                    AppCard {
                        Text(text = "저장된 오늘 기록", style = MaterialTheme.typography.titleMedium)
                        Text(text = "제품 ${record.products.size}개 · 수면 ${record.sleepHours}시간 · 외출 ${record.outdoorMinutes ?: 0}분")
                        Text(text = "건조 ${record.dryness}, 유분 ${record.oiliness}, 붉음 ${record.redness}, 트러블 ${record.trouble}")
                        record.environment?.let {
                            Text(text = environmentSummary(it), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            uiState.message?.let {
                item {
                    Text(text = it, style = MaterialTheme.typography.bodyMedium)
                }
            }

            item {
                Button(
                    onClick = onSave,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !uiState.isSaving
                ) {
                    Text(if (uiState.isSaving) "저장 중" else "오늘 기록 저장")
                }
            }
        } else if (uiState.selectedMode == DailyRecordMode.History) {
            item {
                Text(text = "최근 14일 기록", style = MaterialTheme.typography.titleMedium)
                Text(
                    text = "${uiState.historyFromDate} - ${uiState.historyToDate}",
                    style = MaterialTheme.typography.bodySmall
                )
            }

            items(recentHistoryDates(uiState.historyFromDate, uiState.historyToDate), key = { it }) { date ->
                val record = uiState.historyRecords.firstOrNull { it.recordDate == date }
                HistoryRecordCard(date = date, record = record)
            }

            uiState.message?.let {
                item {
                    Text(text = it, style = MaterialTheme.typography.bodyMedium)
                }
            }
        } else {
            item {
                TrendsSection(
                    trends = uiState.trends
                )
            }

            uiState.message?.let {
                item {
                    Text(text = it, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
private fun ModeButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    if (selected) {
        Button(onClick = onClick) {
            Text(label)
        }
    } else {
        OutlinedButton(onClick = onClick) {
            Text(label)
        }
    }
}

@Composable
private fun ScoreControl(
    label: String,
    kind: ScoreKind,
    value: Int,
    onScoreChanged: (ScoreKind, Int) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(text = label, style = MaterialTheme.typography.labelLarge)
            Text(text = value.toString(), style = MaterialTheme.typography.labelLarge)
        }
        Slider(
            value = value.toFloat(),
            onValueChange = { onScoreChanged(kind, it.toInt()) },
            valueRange = 0f..5f,
            steps = 4,
            colors = SliderDefaults.colors(
                thumbColor = SkinColors.Ink,
                activeTrackColor = SkinColors.PrimaryOlive,
                inactiveTrackColor = SkinColors.Border,
                activeTickColor = SkinColors.PrimaryOlive,
                inactiveTickColor = SkinColors.Muted
            )
        )
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            (0..5).forEach { score ->
                Text(text = score.toString(), style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun UserProductSelectRow(
    userProduct: UserProductDto,
    selected: Boolean,
    onClick: () -> Unit
) {
    AppCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        containerColor = if (selected) SkinColors.PrimaryOliveSoft else SkinColors.Surface
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Checkbox(checked = selected, onCheckedChange = { onClick() })
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = userProduct.product.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${userProduct.product.brand} · ${userProduct.product.category.orEmpty()}",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun SearchResultCard(
    product: ProductDto,
    onClick: () -> Unit
) {
    AppCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        containerColor = SkinColors.Surface
    ) {
        Text(text = product.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
        Text(text = "${product.brand} · ${product.category.orEmpty()}", style = MaterialTheme.typography.bodySmall)
        Text(text = "탭하면 내 제품에 추가하고 오늘 사용 제품으로 선택합니다.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun HistoryRecordCard(
    date: String,
    record: DailyRecordDto?
) {
    AppCard(containerColor = SkinColors.Surface) {
        Text(text = dateLabel(date), style = MaterialTheme.typography.titleMedium)
        if (record == null) {
            Text(text = "기록 없음", style = MaterialTheme.typography.bodyMedium)
        } else {
            Text(text = "제품 ${record.products.size}개 · 수면 ${record.sleepHours}시간 · 외출 ${record.outdoorMinutes ?: 0}분")
            Text(text = "건조 ${record.dryness}, 유분 ${record.oiliness}, 붉음 ${record.redness}, 트러블 ${record.trouble}")
            if (record.appliedPresets.isNotEmpty()) {
                Text(
                    text = "프리셋 ${record.appliedPresets.joinToString { it.name }}",
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (record.facePhoto != null) {
                Text(text = "얼굴 사진 첨부됨", style = MaterialTheme.typography.bodySmall)
            }
            record.environment?.let {
                Text(text = environmentSummary(it), style = MaterialTheme.typography.bodySmall)
            }
            record.memo?.takeIf { it.isNotBlank() }?.let {
                Text(text = it, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

private fun recentHistoryDates(fromDate: String, toDate: String): List<String> =
    runCatching {
        val from = LocalDate.parse(fromDate)
        val to = LocalDate.parse(toDate)
        generateSequence(to) { date -> date.minusDays(1) }
            .takeWhile { date -> !date.isBefore(from) }
            .map { date -> date.toString() }
            .toList()
    }.getOrDefault(emptyList())

@Composable
private fun TrendsSection(
    trends: DailyRecordTrendsDto?
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        SectionHeader(
            title = "추이",
            description = "최근 1달간 저장된 기록을 바탕으로 피부 변화를 시각화합니다."
        )
        Text(
            text = trends?.let { "${it.from} - ${it.to} · 있는 기록만 그래프에 반영" } ?: "기록을 불러오는 중입니다.",
            style = MaterialTheme.typography.bodySmall
        )

        val points = trends?.points.orEmpty()
        TrendMetricCard(
            title = "건조함",
            values = points.mapNotNull { point -> point.scores.dryness?.let { TrendValue(point.date, it) } },
            lineColor = Color(0xFF6EA8FE)
        )
        TrendMetricCard(
            title = "유분",
            values = points.mapNotNull { point -> point.scores.oiliness?.let { TrendValue(point.date, it) } },
            lineColor = Color(0xFF8B5CF6)
        )
        TrendMetricCard(
            title = "붉음",
            values = points.mapNotNull { point -> point.scores.redness?.let { TrendValue(point.date, it) } },
            lineColor = Color(0xFF4ECDC4)
        )
        TrendMetricCard(
            title = "트러블",
            values = points.mapNotNull { point -> point.scores.trouble?.let { TrendValue(point.date, it) } },
            lineColor = Color(0xFFEF8F8F)
        )
    }
}

@Composable
private fun TrendMetricCard(
    title: String,
    values: List<TrendValue>,
    lineColor: Color
) {
    val average = values.map { it.score }.average().takeIf { !it.isNaN() }
    val change = if (values.size >= 2) values.last().score - values.first().score else null

    AppCard(containerColor = SkinColors.Surface) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(text = title, style = MaterialTheme.typography.titleMedium)
                Text(
                    text = average?.let { "평균 ${formatOneDecimal(it)}" } ?: "평균 없음",
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Text(
                text = changeLabel(change),
                style = MaterialTheme.typography.labelLarge,
                color = changeColor(change)
            )
        }

        if (values.isEmpty()) {
            Text(text = "아직 그래프로 표시할 기록이 없습니다.", style = MaterialTheme.typography.bodyMedium)
            return@AppCard
        }

        TrendLineChart(
            values = values,
            lineColor = lineColor,
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
        )

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(text = dateLabel(values.first().date), style = MaterialTheme.typography.bodySmall)
            Text(text = "기록 ${values.size}개", style = MaterialTheme.typography.bodySmall)
            Text(text = dateLabel(values.last().date), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun TrendLineChart(
    values: List<TrendValue>,
    lineColor: Color,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val horizontalPadding = 10.dp.toPx()
        val verticalPadding = 16.dp.toPx()
        val chartWidth = size.width - horizontalPadding * 2
        val chartHeight = size.height - verticalPadding * 2

        repeat(6) { index ->
            val y = verticalPadding + chartHeight * index / 5f
            drawLine(
                color = SkinColors.Border,
                start = Offset(horizontalPadding, y),
                end = Offset(size.width - horizontalPadding, y),
                strokeWidth = 1.dp.toPx()
            )
        }

        val offsets = values.mapIndexed { index, value ->
            val x = if (values.size == 1) {
                size.width / 2f
            } else {
                horizontalPadding + chartWidth * index / (values.lastIndex).toFloat()
            }
            val y = verticalPadding + chartHeight * (5 - value.score) / 5f
            Offset(x, y)
        }

        if (offsets.size >= 2) {
            val path = Path().apply {
                moveTo(offsets.first().x, offsets.first().y)
                offsets.drop(1).forEach { point -> lineTo(point.x, point.y) }
            }
            drawPath(
                path = path,
                color = lineColor,
                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
            )
        }

        offsets.forEach { point ->
            drawCircle(color = lineColor, radius = 4.dp.toPx(), center = point)
            drawCircle(color = Color.White, radius = 2.dp.toPx(), center = point)
        }
    }
}

private data class TrendValue(
    val date: String,
    val score: Int
)

private fun formatOneDecimal(value: Double): String =
    String.format("%.1f", value)

private fun changeLabel(change: Int?): String = when {
    change == null -> "변화량 없음"
    change > 0 -> "+$change"
    change < 0 -> "$change"
    else -> "변화 없음"
}

private fun changeColor(change: Int?): Color = when {
    change == null || change == 0 -> SkinColors.TextSecondary
    change > 0 -> Color(0xFFEF8F8F)
    else -> Color(0xFF4ECDC4)
}

@Composable
private fun WeatherSummaryCard(
    userLocationLabel: String?,
    environment: DailyRecordEnvironmentDto?
) {
    AppCard {
        Text(text = "날씨와 환경", style = MaterialTheme.typography.titleMedium)
        if (userLocationLabel == null) {
            Text(
                text = "설정 탭에서 지역을 먼저 선택하면 오늘 기록에 기상청 관측값이 함께 저장됩니다.",
                style = MaterialTheme.typography.bodySmall
            )
        } else {
            Text(text = userLocationLabel, style = MaterialTheme.typography.bodyMedium)
            Text(
                text = environment?.let(::environmentSummary)
                    ?: "오늘 기록을 저장하면 가장 가까운 시각의 관측값을 불러옵니다.",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

private fun environmentSummary(environment: DailyRecordEnvironmentDto): String {
    val values = listOfNotNull(
        environment.temperatureCelsius?.let { "기온 ${it}°C" },
        environment.humidityPercent?.let { "습도 ${it}%" },
        environment.precipitationAmountMm?.let { "강수 ${it}mm" },
        environment.windSpeedMps?.let { "풍속 ${it}m/s" }
    ).joinToString(" · ")
    val station = environment.weatherStationName?.let { "$it 관측소" }

    return listOfNotNull(station, values.takeIf { it.isNotBlank() }).joinToString(" · ")
}

private fun dateLabel(date: String): String =
    runCatching {
        val parsedDate = LocalDate.parse(date)
        "${parsedDate.monthValue}월 ${parsedDate.dayOfMonth}일"
    }.getOrDefault(date)

private fun Uri.toFacePhotoUpload(context: Context): FacePhotoUpload? {
    val contentResolver = context.contentResolver
    val contentType = contentResolver.getType(this) ?: return null
    if (contentType != "image/jpeg" && contentType != "image/png") {
        return null
    }

    val bytes = contentResolver.openInputStream(this)?.use { it.readBytes() } ?: return null
    val fileName = contentResolver.query(this, null, null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (cursor.moveToFirst() && nameIndex >= 0) cursor.getString(nameIndex) else null
    } ?: if (contentType == "image/png") "face-photo.png" else "face-photo.jpg"

    return FacePhotoUpload(
        fileName = fileName,
        contentType = contentType,
        bytes = bytes
    )
}

@Preview(showBackground = true)
@Composable
private fun DailyRecordScreenPreview() {
    SkinDataTheme {
        DailyRecordScreen(
            uiState = DailyRecordUiState(),
            onModeSelected = {},
            onScoreChanged = { _, _ -> },
            onSleepHoursChanged = {},
            onOutdoorMinutesChanged = {},
            onMemoChanged = {},
            onToggleProduct = {},
            onApplyPreset = {},
            onPresetNameChanged = {},
            onCreatePreset = {},
            onProductSearchQueryChanged = {},
            onSearchProducts = {},
            onAddProductToToday = {},
            onPhotoSelected = {},
            onSave = {}
        )
    }
}
