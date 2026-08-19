package com.hackathon.skindata.feature.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hackathon.skindata.core.network.BackendApiClient
import com.hackathon.skindata.core.network.ConfirmProductSubmissionRequest
import com.hackathon.skindata.core.network.FacePhotoUpload
import com.hackathon.skindata.core.network.ProductDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ProductRegistrationViewModel(
    private val backendApiClient: BackendApiClient = BackendApiClient()
) : ViewModel() {
    private val _uiState = MutableStateFlow(ProductRegistrationUiState())
    val uiState: StateFlow<ProductRegistrationUiState> = _uiState.asStateFlow()

    fun loadUserProducts(accessToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, message = null) }

            runCatching {
                backendApiClient.getUserProducts(accessToken)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        userProducts = response.items,
                        message = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = error.message ?: "등록한 제품을 불러오지 못했습니다."
                    )
                }
            }
        }
    }

    fun onQueryChanged(value: String) {
        _uiState.update {
            it.copy(
                query = value,
                hasSearched = false,
                searchResults = emptyList(),
                selectedProduct = null,
                message = null
            )
        }
    }

    fun onReactionMemoChanged(value: String) {
        _uiState.update {
            it.copy(
                reactionMemo = value,
                message = null
            )
        }
    }

    fun search() {
        val query = _uiState.value.query.trim()

        if (query.isBlank()) {
            _uiState.update { it.copy(message = "제품명, 브랜드, 카테고리 중 하나를 입력해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    hasSearched = true,
                    searchResults = emptyList(),
                    selectedProduct = null
                )
            }

            runCatching {
                backendApiClient.searchProducts(query)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        searchResults = response.items,
                        message = if (response.items.isEmpty()) {
                            "검색 결과가 없습니다. 직접 등록을 이용해주세요."
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

    fun updateUsageStatus(accessToken: String, userProductId: String, usageStatus: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, message = null) }

            runCatching {
                backendApiClient.updateUserProductStatus(
                    accessToken = accessToken,
                    userProductId = userProductId,
                    usageStatus = usageStatus
                )
                backendApiClient.getUserProducts(accessToken).items
            }.onSuccess { userProducts ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        userProducts = userProducts,
                        message = if (usageStatus == "current") "사용중으로 이동했습니다." else "과거 사용으로 이동했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        message = error.message ?: "제품 상태를 변경하지 못했습니다."
                    )
                }
            }
        }
    }

    fun selectProduct(product: ProductDto) {
        _uiState.update {
            it.copy(
                selectedProduct = product,
                message = null
            )
        }
    }

    fun selectSubmissionItemType(itemType: ProductItemType) {
        _uiState.update { it.copy(submissionItemType = itemType, message = null) }
    }

    fun onSubmissionNameChanged(value: String) {
        _uiState.update { it.copy(submissionName = value, message = null) }
    }

    fun onSubmissionBrandChanged(value: String) {
        _uiState.update { it.copy(submissionBrand = value, message = null) }
    }

    fun onSubmissionIngredientsChanged(value: String) {
        _uiState.update { it.copy(submissionIngredientsText = value, message = null) }
    }

    fun setSubmissionPhoto(photo: FacePhotoUpload?) {
        _uiState.update {
            it.copy(
                submissionPhoto = photo,
                message = if (photo == null) null else "성분표 또는 라벨 사진을 선택했습니다."
            )
        }
    }

    fun extractSubmission(accessToken: String) {
        val state = _uiState.value
        val photo = state.submissionPhoto

        if (photo == null) {
            _uiState.update { it.copy(message = "성분표 또는 라벨 사진을 먼저 선택해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, message = null) }

            runCatching {
                backendApiClient.extractProductSubmission(
                    accessToken = accessToken,
                    itemType = state.submissionItemType.code,
                    labelPhoto = photo
                )
            }.onSuccess { extraction ->
                val ingredientsText = if (extraction.extractedText.isNotBlank()) {
                    extraction.extractedText
                } else {
                    extraction.ingredients.joinToString(", ") { it.rawName }
                }
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        submissionAiExtractedText = extraction.extractedText,
                        submissionIngredientsText = ingredientsText,
                        message = "AI 추출 결과를 확인하고 필요하면 수정해주세요."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = error.message ?: "AI 추출에 실패했습니다. 직접 입력해 저장할 수 있습니다."
                    )
                }
            }
        }
    }

    fun confirmSubmission(accessToken: String) {
        val state = _uiState.value
        val name = state.submissionName.trim()
        val brand = state.submissionBrand.trim()
        val ingredientsText = state.submissionIngredientsText.trim()

        if (name.isBlank() || brand.isBlank()) {
            _uiState.update { it.copy(message = "제품명과 브랜드를 입력해주세요.") }
            return
        }

        if (ingredientsText.isBlank()) {
            _uiState.update { it.copy(message = "확정할 성분 또는 원료 텍스트를 입력해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, message = null) }

            runCatching {
                backendApiClient.confirmProductSubmission(
                    accessToken = accessToken,
                    request = ConfirmProductSubmissionRequest(
                        itemType = state.submissionItemType.code,
                        name = name,
                        brand = brand,
                        category = null,
                        aiExtractedText = state.submissionAiExtractedText,
                        confirmedIngredientsText = ingredientsText
                    )
                )
            }.onSuccess {
                val userProducts = backendApiClient.getUserProducts(accessToken).items
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        userProducts = userProducts,
                        submissionName = "",
                        submissionBrand = "",
                        submissionIngredientsText = "",
                        submissionAiExtractedText = null,
                        submissionPhoto = null,
                        message = "내 제품 목록에 추가했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        message = error.message ?: "직접 등록에 실패했습니다."
                    )
                }
            }
        }
    }

    fun saveSelectedProduct(accessToken: String) {
        val selectedProduct = _uiState.value.selectedProduct

        if (selectedProduct == null) {
            _uiState.update { it.copy(message = "등록할 제품을 선택해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, message = null) }

            runCatching {
                backendApiClient.savePastUserProduct(
                    accessToken = accessToken,
                    productId = selectedProduct.id,
                    pastReactionMemo = _uiState.value.reactionMemo.trim()
                )
            }.onSuccess {
                val userProducts = backendApiClient.getUserProducts(accessToken).items
                _uiState.update { state ->
                    state.copy(
                        isSaving = false,
                        userProducts = userProducts,
                        selectedProduct = null,
                        reactionMemo = "",
                        message = "이전에 사용해본 제품으로 저장했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        message = error.message ?: "제품 등록에 실패했습니다."
                    )
                }
            }
        }
    }
}
