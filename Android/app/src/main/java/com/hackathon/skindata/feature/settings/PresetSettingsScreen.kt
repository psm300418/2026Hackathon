package com.hackathon.skindata.feature.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.core.designsystem.AppCard
import com.hackathon.skindata.core.designsystem.AppTextField
import com.hackathon.skindata.core.designsystem.SkinColors
import com.hackathon.skindata.core.designsystem.SkinOutlinedButton as OutlinedButton
import com.hackathon.skindata.core.designsystem.SkinPrimaryButton as Button
import com.hackathon.skindata.core.network.ProductPresetDto
import com.hackathon.skindata.core.network.UserProductDto

@Composable
fun PresetSettingsRoute(
    accessToken: String,
    viewModel: PresetSettingsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(accessToken) {
        viewModel.load(accessToken)
    }

    PresetSettingsScreen(
        uiState = uiState,
        onEdit = viewModel::startEditing,
        onCancel = viewModel::cancelEditing,
        onNameChanged = viewModel::onNameChanged,
        onToggleUserProduct = viewModel::toggleUserProduct,
        onSave = { viewModel.save(accessToken) },
        onDelete = { presetId -> viewModel.delete(accessToken, presetId) }
    )
}

@Composable
private fun PresetSettingsScreen(
    uiState: PresetSettingsUiState,
    onEdit: (ProductPresetDto) -> Unit,
    onCancel: () -> Unit,
    onNameChanged: (String) -> Unit,
    onToggleUserProduct: (String) -> Unit,
    onSave: () -> Unit,
    onDelete: (String) -> Unit
) {
    AppCard(containerColor = SkinColors.Surface) {
        Text(text = "프리셋 관리", style = MaterialTheme.typography.titleMedium)

        if (uiState.isLoading) {
            CircularProgressIndicator()
        }

        uiState.message?.let {
            Text(text = it, style = MaterialTheme.typography.bodyMedium)
        }

        if (!uiState.isLoading && uiState.presets.isEmpty()) {
            Text(text = "저장된 프리셋이 없습니다.", style = MaterialTheme.typography.bodyMedium)
        }

        uiState.presets.forEach { preset ->
            PresetRow(
                preset = preset,
                isEditing = uiState.editingPresetId == preset.id,
                userProducts = uiState.userProducts,
                editingName = uiState.editingName,
                editingUserProductIds = uiState.editingUserProductIds,
                isSaving = uiState.isSaving,
                onEdit = { onEdit(preset) },
                onCancel = onCancel,
                onNameChanged = onNameChanged,
                onToggleUserProduct = onToggleUserProduct,
                onSave = onSave,
                onDelete = { onDelete(preset.id) }
            )
        }
    }
}

@Composable
private fun PresetRow(
    preset: ProductPresetDto,
    isEditing: Boolean,
    userProducts: List<UserProductDto>,
    editingName: String,
    editingUserProductIds: Set<String>,
    isSaving: Boolean,
    onEdit: () -> Unit,
    onCancel: () -> Unit,
    onNameChanged: (String) -> Unit,
    onToggleUserProduct: (String) -> Unit,
    onSave: () -> Unit,
    onDelete: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = preset.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                Text(
                    text = preset.products.joinToString { it.product.name }.ifBlank { "제품 없음" },
                    style = MaterialTheme.typography.bodySmall
                )
            }
            OutlinedButton(onClick = onEdit, enabled = !isSaving) {
                Text("수정")
            }
        }

        if (isEditing) {
            AppTextField(
                value = editingName,
                onValueChange = onNameChanged,
                label = "프리셋 이름",
                singleLine = true
            )
            userProducts.forEach { userProduct ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onToggleUserProduct(userProduct.id) },
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Checkbox(
                        checked = userProduct.id in editingUserProductIds,
                        onCheckedChange = { onToggleUserProduct(userProduct.id) }
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = userProduct.product.name, style = MaterialTheme.typography.bodyMedium)
                        Text(text = userProduct.product.brand, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onSave, enabled = !isSaving) {
                    Text("저장")
                }
                OutlinedButton(onClick = onCancel, enabled = !isSaving) {
                    Text("취소")
                }
                OutlinedButton(onClick = onDelete, enabled = !isSaving) {
                    Text("삭제")
                }
            }
        }
    }
}
