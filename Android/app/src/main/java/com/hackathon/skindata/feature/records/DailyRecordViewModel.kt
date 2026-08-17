package com.hackathon.skindata.feature.records

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hackathon.skindata.core.network.BackendApiClient
import com.hackathon.skindata.core.network.FacePhotoUpload
import com.hackathon.skindata.core.network.ProductDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class DailyRecordViewModel(
    private val backendApiClient: BackendApiClient = BackendApiClient()
) : ViewModel() {
    private val _uiState = MutableStateFlow(DailyRecordUiState(isLoading = true))
    val uiState: StateFlow<DailyRecordUiState> = _uiState.asStateFlow()

    fun load(accessToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, message = null) }

            runCatching {
                val userProducts = backendApiClient.getUserProducts(accessToken).items
                val presets = backendApiClient.getProductPresets(accessToken).items
                val records = backendApiClient.getDailyRecords(accessToken).items
                Triple(userProducts, presets, records.firstOrNull())
            }.onSuccess { (userProducts, presets, todayRecord) ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        userProducts = userProducts,
                        presets = presets,
                        todayRecord = todayRecord,
                        selectedUserProductIds = todayRecord?.products?.map { product -> product.id }?.toSet()
                            ?: it.selectedUserProductIds,
                        appliedPresetIds = todayRecord?.appliedPresets?.map { preset -> preset.id }?.toSet()
                            ?: it.appliedPresetIds,
                        dryness = todayRecord?.dryness ?: it.dryness,
                        oiliness = todayRecord?.oiliness ?: it.oiliness,
                        redness = todayRecord?.redness ?: it.redness,
                        trouble = todayRecord?.trouble ?: it.trouble,
                        sleepHours = todayRecord?.sleepHours?.toString() ?: it.sleepHours,
                        memo = todayRecord?.memo ?: it.memo,
                        message = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = error.message ?: "오늘 기록 정보를 불러오지 못했습니다."
                    )
                }
            }
        }
    }

    fun onSleepHoursChanged(value: String) {
        _uiState.update { it.copy(sleepHours = value, message = null) }
    }

    fun onMemoChanged(value: String) {
        _uiState.update { it.copy(memo = value, message = null) }
    }

    fun onPresetNameChanged(value: String) {
        _uiState.update { it.copy(presetName = value, message = null) }
    }

    fun onProductSearchQueryChanged(value: String) {
        _uiState.update { it.copy(productSearchQuery = value, message = null) }
    }

    fun setFacePhoto(photo: FacePhotoUpload?) {
        _uiState.update {
            it.copy(
                facePhoto = photo,
                message = if (photo == null) null else "얼굴 사진을 선택했습니다."
            )
        }
    }

    fun updateScore(kind: ScoreKind, value: Int) {
        val score = value.coerceIn(0, 5)
        _uiState.update {
            when (kind) {
                ScoreKind.Dryness -> it.copy(dryness = score, message = null)
                ScoreKind.Oiliness -> it.copy(oiliness = score, message = null)
                ScoreKind.Redness -> it.copy(redness = score, message = null)
                ScoreKind.Trouble -> it.copy(trouble = score, message = null)
            }
        }
    }

    fun toggleUserProduct(userProductId: String) {
        _uiState.update {
            val selectedIds = if (userProductId in it.selectedUserProductIds) {
                it.selectedUserProductIds - userProductId
            } else {
                it.selectedUserProductIds + userProductId
            }
            it.copy(selectedUserProductIds = selectedIds, message = null)
        }
    }

    fun applyPreset(presetId: String) {
        _uiState.update { state ->
            val preset = state.presets.firstOrNull { it.id == presetId } ?: return@update state
            state.copy(
                appliedPresetIds = state.appliedPresetIds + presetId,
                selectedUserProductIds = state.selectedUserProductIds + preset.products.map { it.id },
                message = "${preset.name} 프리셋을 적용했습니다."
            )
        }
    }

    fun searchProducts() {
        val query = _uiState.value.productSearchQuery.trim()

        if (query.isBlank()) {
            _uiState.update { it.copy(message = "추가할 제품명을 입력해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, productSearchResults = emptyList(), message = null) }

            runCatching {
                backendApiClient.searchProducts(query)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        productSearchResults = response.items,
                        message = if (response.items.isEmpty()) {
                            "검색 결과가 없습니다. 새 공용 제품 등록은 다음 기능에서 지원합니다."
                        } else {
                            null
                        }
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = error.message ?: "제품 검색에 실패했습니다."
                    )
                }
            }
        }
    }

    fun addProductToToday(accessToken: String, product: ProductDto) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, message = null) }

            runCatching {
                val userProduct = backendApiClient.savePastUserProduct(
                    accessToken = accessToken,
                    productId = product.id,
                    pastReactionMemo = ""
                )
                val userProducts = backendApiClient.getUserProducts(accessToken).items
                userProduct to userProducts
            }.onSuccess { (userProduct, userProducts) ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        userProducts = userProducts,
                        selectedUserProductIds = it.selectedUserProductIds + userProduct.id,
                        productSearchResults = emptyList(),
                        productSearchQuery = "",
                        message = "내 제품에 추가하고 오늘 사용 제품으로 선택했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        message = error.message ?: "제품 추가에 실패했습니다."
                    )
                }
            }
        }
    }

    fun createPreset(accessToken: String) {
        val state = _uiState.value
        val name = state.presetName.trim()

        if (name.isBlank()) {
            _uiState.update { it.copy(message = "프리셋 이름을 입력해주세요.") }
            return
        }

        if (state.selectedUserProductIds.isEmpty()) {
            _uiState.update { it.copy(message = "프리셋에 담을 제품을 먼저 선택해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, message = null) }

            runCatching {
                backendApiClient.saveProductPreset(
                    accessToken = accessToken,
                    name = name,
                    userProductIds = state.selectedUserProductIds.toList()
                )
                backendApiClient.getProductPresets(accessToken).items
            }.onSuccess { presets ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        presets = presets,
                        presetName = "",
                        message = "프리셋을 저장했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        message = error.message ?: "프리셋 저장에 실패했습니다."
                    )
                }
            }
        }
    }

    fun saveToday(accessToken: String) {
        val state = _uiState.value
        val sleepHours = state.sleepHours.toDoubleOrNull()

        if (sleepHours == null || sleepHours < 0.0 || sleepHours > 24.0) {
            _uiState.update { it.copy(message = "수면 시간은 0부터 24 사이로 입력해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, message = null) }

            runCatching {
                backendApiClient.saveDailyRecord(
                    accessToken = accessToken,
                    request = com.hackathon.skindata.core.network.SaveDailyRecordRequest(
                        recordDate = state.recordDate,
                        dryness = state.dryness,
                        oiliness = state.oiliness,
                        redness = state.redness,
                        trouble = state.trouble,
                        sleepHours = sleepHours,
                        userProductIds = state.selectedUserProductIds.toList(),
                        appliedPresetIds = state.appliedPresetIds.toList(),
                        memo = state.memo.ifBlank { null }
                    ),
                    facePhoto = state.facePhoto
                )
            }.onSuccess { record ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        todayRecord = record,
                        facePhoto = null,
                        message = "오늘의 피부 기록을 저장했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        message = error.message ?: "오늘 기록 저장에 실패했습니다."
                    )
                }
            }
        }
    }
}

enum class ScoreKind {
    Dryness,
    Oiliness,
    Redness,
    Trouble
}
