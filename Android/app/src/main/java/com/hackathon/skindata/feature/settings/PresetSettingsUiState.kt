package com.hackathon.skindata.feature.settings

import com.hackathon.skindata.core.network.ProductPresetDto
import com.hackathon.skindata.core.network.UserProductDto

data class PresetSettingsUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val presets: List<ProductPresetDto> = emptyList(),
    val userProducts: List<UserProductDto> = emptyList(),
    val editingPresetId: String? = null,
    val editingName: String = "",
    val editingUserProductIds: Set<String> = emptySet(),
    val message: String? = null
)
