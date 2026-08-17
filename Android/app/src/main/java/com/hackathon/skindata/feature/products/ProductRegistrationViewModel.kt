package com.hackathon.skindata.feature.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hackathon.skindata.core.network.BackendApiClient
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
            _uiState.update { it.copy(isLoading = true, searchResults = emptyList(), selectedProduct = null) }

            runCatching {
                backendApiClient.searchProducts(query)
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        searchResults = response.items,
                        message = if (response.items.isEmpty()) {
                            "아직 등록된 제품이 없습니다. 직접 등록은 다음 단계에서 지원할 예정입니다."
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

    fun selectProduct(product: ProductDto) {
        _uiState.update {
            it.copy(
                selectedProduct = product,
                message = null
            )
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
