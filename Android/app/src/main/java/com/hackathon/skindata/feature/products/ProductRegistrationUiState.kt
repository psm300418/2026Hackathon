package com.hackathon.skindata.feature.products

import com.hackathon.skindata.core.network.ProductDto
import com.hackathon.skindata.core.network.FacePhotoUpload
import com.hackathon.skindata.core.network.UserProductDto

data class ProductRegistrationUiState(
    val query: String = "",
    val reactionMemo: String = "",
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val hasSearched: Boolean = false,
    val isDirectSubmissionExpanded: Boolean = false,
    val searchResults: List<ProductDto> = emptyList(),
    val userProducts: List<UserProductDto> = emptyList(),
    val selectedProduct: ProductDto? = null,
    val submissionItemType: ProductItemType = ProductItemType.Cosmetic,
    val submissionName: String = "",
    val submissionBrand: String = "",
    val submissionIngredientsText: String = "",
    val submissionAiExtractedText: String? = null,
    val submissionPhoto: FacePhotoUpload? = null,
    val message: String? = null
)

enum class ProductItemType(
    val code: String,
    val label: String
) {
    Cosmetic("cosmetic", "화장품"),
    ShowerProduct("shower_product", "샤워용품"),
    Supplement("supplement", "영양제")
}
