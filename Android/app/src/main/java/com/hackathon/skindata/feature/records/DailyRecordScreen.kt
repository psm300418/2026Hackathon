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
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import com.hackathon.skindata.core.network.FacePhotoUpload
import com.hackathon.skindata.core.network.ProductDto
import com.hackathon.skindata.core.network.ProductPresetDto
import com.hackathon.skindata.core.network.UserProductDto
import com.hackathon.skindata.ui.theme.SkinDataTheme

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
        onScoreChanged = viewModel::updateScore,
        onSleepHoursChanged = viewModel::onSleepHoursChanged,
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
    onScoreChanged: (ScoreKind, Int) -> Unit,
    onSleepHoursChanged: (String) -> Unit,
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

        if (uiState.isLoading) {
            item { CircularProgressIndicator() }
        }

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
                        Text(text = "제품 ${record.products.size}개 · 수면 ${record.sleepHours}시간")
                        Text(text = "건조 ${record.dryness}, 유분 ${record.oiliness}, 붉음 ${record.redness}, 트러블 ${record.trouble}")
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
    }
}

@Composable
private fun ScoreControl(
    label: String,
    kind: ScoreKind,
    value: Int,
    onScoreChanged: (ScoreKind, Int) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = "$label $value", style = MaterialTheme.typography.bodyLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { onScoreChanged(kind, value - 1) }) {
                Text("-")
            }
            Button(onClick = { onScoreChanged(kind, value + 1) }) {
                Text("+")
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
            onScoreChanged = { _, _ -> },
            onSleepHoursChanged = {},
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
