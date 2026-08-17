package com.hackathon.skindata.feature.products

import com.hackathon.skindata.core.network.ProductDto
import com.hackathon.skindata.core.network.UserProductDto

data class ProductRegistrationUiState(
    val query: String = "",
    val reactionMemo: String = "",
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val searchResults: List<ProductDto> = emptyList(),
    val userProducts: List<UserProductDto> = emptyList(),
    val selectedProduct: ProductDto? = null,
    val message: String? = null
)
