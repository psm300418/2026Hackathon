package com.hackathon.skindata.feature.records

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.core.designsystem.SkinOutlinedButton as OutlinedButton
import com.hackathon.skindata.core.designsystem.SkinPrimaryButton as Button
import com.hackathon.skindata.core.network.DailyRecordDto
import com.hackathon.skindata.core.network.DailyRecordEnvironmentDto
import com.hackathon.skindata.core.network.DailyRecordTrendPointDto
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
        onTrendDaysSelected = { days -> viewModel.selectTrendDays(accessToken, days) },
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
    onTrendDaysSelected: (Int) -> Unit,
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
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(text = "오늘의 피부 기록", style = MaterialTheme.typography.headlineSmall)
            Text(
                text = "${uiState.recordDate} 기록은 하루 1개로 저장되고 다시 저장하면 갱신됩니다.",
                style = MaterialTheme.typography.bodyMedium
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
                ScoreControl("건조함", ScoreKind.Dryness, uiState.dryness, onScoreChanged)
                ScoreControl("유분", ScoreKind.Oiliness, uiState.oiliness, onScoreChanged)
                ScoreControl("붉음", ScoreKind.Redness, uiState.redness, onScoreChanged)
                ScoreControl("트러블", ScoreKind.Trouble, uiState.trouble, onScoreChanged)
            }

            item {
                OutlinedTextField(
                    value = uiState.sleepHours,
                    onValueChange = onSleepHoursChanged,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("수면 시간") },
                    singleLine = true
                )
            }

            item {
                OutlinedTextField(
                    value = uiState.outdoorMinutes,
                    onValueChange = onOutdoorMinutesChanged,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("외출 시간(분)") },
                    singleLine = true
                )
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
                    OutlinedTextField(
                        value = uiState.presetName,
                        onValueChange = onPresetNameChanged,
                        modifier = Modifier.weight(1f),
                        label = { Text("새 프리셋 이름") },
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
                    OutlinedTextField(
                        value = uiState.productSearchQuery,
                        onValueChange = onProductSearchQueryChanged,
                        modifier = Modifier.weight(1f),
                        label = { Text("제품명 또는 브랜드") },
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
                OutlinedTextField(
                    value = uiState.memo,
                    onValueChange = onMemoChanged,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("메모") },
                    minLines = 2,
                    maxLines = 4
                )
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "얼굴 사진", style = MaterialTheme.typography.titleMedium)
                        Text(
                            text = "선택 사항입니다. 사진 없이도 저장할 수 있습니다.",
                            style = MaterialTheme.typography.bodySmall
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedButton(onClick = { photoPicker.launch("image/*") }) {
                            Text(if (uiState.facePhoto == null) "사진 선택" else "사진 다시 선택")
                        }
                        uiState.facePhoto?.let {
                            Text(text = "${it.fileName} 선택됨", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            uiState.todayRecord?.let { record ->
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(text = "저장된 오늘 기록", style = MaterialTheme.typography.titleMedium)
                            Text(text = "제품 ${record.products.size}개 · 수면 ${record.sleepHours}시간 · 외출 ${record.outdoorMinutes ?: 0}분")
                            Text(text = "건조 ${record.dryness}, 유분 ${record.oiliness}, 붉음 ${record.redness}, 트러블 ${record.trouble}")
                            record.environment?.let {
                                Text(text = environmentSummary(it), style = MaterialTheme.typography.bodySmall)
                            }
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
                    trends = uiState.trends,
                    selectedDays = uiState.trendDays,
                    onTrendDaysSelected = onTrendDaysSelected
                )
            }

            uiState.trends?.points.orEmpty().forEach { point ->
                item(key = "trend-${point.date}") {
                    TrendPointCard(point = point)
                }
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
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(text = "$label $value/5", style = MaterialTheme.typography.bodyLarge)
        (0..5).chunked(3).forEach { scores ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                scores.forEach { score ->
                    ScoreOptionButton(
                        score = score,
                        selected = value == score,
                        onClick = { onScoreChanged(kind, score) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
private fun ScoreOptionButton(
    score: Int,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (selected) {
        Button(onClick = onClick, modifier = modifier) {
            Text(score.toString())
        }
    } else {
        OutlinedButton(onClick = onClick, modifier = modifier) {
            Text(score.toString())
        }
    }
}

@Composable
private fun UserProductSelectRow(
    userProduct: UserProductDto,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
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
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(text = product.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
            Text(text = "${product.brand} · ${product.category.orEmpty()}", style = MaterialTheme.typography.bodySmall)
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = "탭하면 내 제품에 추가하고 오늘 사용 제품으로 선택합니다.", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun HistoryRecordCard(
    date: String,
    record: DailyRecordDto?
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp)) {
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
    trends: DailyRecordTrendsDto?,
    selectedDays: Int,
    onTrendDaysSelected: (Int) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(text = "피부 상태 추이", style = MaterialTheme.typography.titleMedium)
        Text(
            text = trends?.let { "${it.from} - ${it.to}" } ?: "기록을 불러오는 중입니다.",
            style = MaterialTheme.typography.bodySmall
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(7, 14, 30).forEach { days ->
                ModeButton(
                    label = "${days}일",
                    selected = selectedDays == days,
                    onClick = { onTrendDaysSelected(days) }
                )
            }
        }
    }
}

@Composable
private fun TrendPointCard(point: DailyRecordTrendPointDto) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(text = dateLabel(point.date), style = MaterialTheme.typography.titleMedium)
            if (point.scores.dryness == null) {
                Text(text = "기록 없음", style = MaterialTheme.typography.bodyMedium)
                return@Column
            }

            TrendScoreRow(label = "건조", value = point.scores.dryness)
            TrendScoreRow(label = "유분", value = point.scores.oiliness)
            TrendScoreRow(label = "붉음", value = point.scores.redness)
            TrendScoreRow(label = "트러블", value = point.scores.trouble)
            Text(
                text = "수면 ${point.sleepHours ?: "-"}시간 · 외출 ${point.outdoorMinutes ?: 0}분",
                style = MaterialTheme.typography.bodySmall
            )
            Text(text = trendProductSummary(point), style = MaterialTheme.typography.bodySmall)
            point.environment?.let {
                Text(text = environmentSummary(it), style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun TrendScoreRow(
    label: String,
    value: Int?
) {
    val score = value ?: 0
    Text(
        text = "$label ${score}/5 ${scoreBar(score)}",
        style = MaterialTheme.typography.bodySmall
    )
}

private fun scoreBar(score: Int): String =
    (1..5).joinToString("") { index -> if (index <= score) "■" else "□" }

private fun trendProductSummary(point: DailyRecordTrendPointDto): String {
    if (point.productSummary.count == 0) {
        return "사용 제품 없음"
    }

    val suffix = if (point.productSummary.remainingCount > 0) {
        " 외 ${point.productSummary.remainingCount}개"
    } else {
        ""
    }

    return "사용 제품 ${point.productSummary.count}개: ${point.productSummary.names.joinToString(", ")}$suffix"
}

@Composable
private fun WeatherSummaryCard(
    userLocationLabel: String?,
    environment: DailyRecordEnvironmentDto?
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
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
            onTrendDaysSelected = {},
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
