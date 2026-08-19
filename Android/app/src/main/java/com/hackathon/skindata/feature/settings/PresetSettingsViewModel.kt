package com.hackathon.skindata.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hackathon.skindata.core.network.BackendApiClient
import com.hackathon.skindata.core.network.ProductPresetDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class PresetSettingsViewModel(
    private val backendApiClient: BackendApiClient = BackendApiClient()
) : ViewModel() {
    private val _uiState = MutableStateFlow(PresetSettingsUiState())
    val uiState: StateFlow<PresetSettingsUiState> = _uiState.asStateFlow()

    fun load(accessToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, message = null) }

            runCatching {
                val presets = backendApiClient.getProductPresets(accessToken).items
                val userProducts = backendApiClient.getUserProducts(accessToken).items
                presets to userProducts
            }.onSuccess { (presets, userProducts) ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        presets = presets,
                        userProducts = userProducts,
                        message = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = error.message ?: "프리셋을 불러오지 못했습니다."
                    )
                }
            }
        }
    }

    fun startEditing(preset: ProductPresetDto) {
        _uiState.update {
            it.copy(
                editingPresetId = preset.id,
                editingName = preset.name,
                editingUserProductIds = preset.products.map { product -> product.id }.toSet(),
                message = null
            )
        }
    }

    fun cancelEditing() {
        _uiState.update {
            it.copy(
                editingPresetId = null,
                editingName = "",
                editingUserProductIds = emptySet(),
                message = null
            )
        }
    }

    fun onNameChanged(value: String) {
        _uiState.update { it.copy(editingName = value, message = null) }
    }

    fun toggleUserProduct(userProductId: String) {
        _uiState.update {
            val ids = if (userProductId in it.editingUserProductIds) {
                it.editingUserProductIds - userProductId
            } else {
                it.editingUserProductIds + userProductId
            }
            it.copy(editingUserProductIds = ids, message = null)
        }
    }

    fun save(accessToken: String) {
        val state = _uiState.value
        val presetId = state.editingPresetId ?: return
        val name = state.editingName.trim()

        if (name.isBlank()) {
            _uiState.update { it.copy(message = "프리셋 이름을 입력해주세요.") }
            return
        }

        if (state.editingUserProductIds.isEmpty()) {
            _uiState.update { it.copy(message = "프리셋에 담을 제품을 선택해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, message = null) }

            runCatching {
                backendApiClient.updateProductPreset(
                    accessToken = accessToken,
                    presetId = presetId,
                    name = name,
                    userProductIds = state.editingUserProductIds.toList()
                )
                backendApiClient.getProductPresets(accessToken).items
            }.onSuccess { presets ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        presets = presets,
                        editingPresetId = null,
                        editingName = "",
                        editingUserProductIds = emptySet(),
                        message = "프리셋을 수정했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        message = error.message ?: "프리셋을 수정하지 못했습니다."
                    )
                }
            }
        }
    }

    fun delete(accessToken: String, presetId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, message = null) }

            runCatching {
                backendApiClient.deleteProductPreset(accessToken, presetId)
                backendApiClient.getProductPresets(accessToken).items
            }.onSuccess { presets ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        presets = presets,
                        editingPresetId = null,
                        editingName = "",
                        editingUserProductIds = emptySet(),
                        message = "프리셋을 삭제했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        message = error.message ?: "프리셋을 삭제하지 못했습니다."
                    )
                }
            }
        }
    }
}
