package com.hackathon.skindata.feature.records

import com.hackathon.skindata.core.network.DailyRecordDto
import com.hackathon.skindata.core.network.FacePhotoUpload
import com.hackathon.skindata.core.network.ProductDto
import com.hackathon.skindata.core.network.ProductPresetDto
import com.hackathon.skindata.core.network.UserProductDto
import java.time.LocalDate

data class DailyRecordUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val recordDate: String = LocalDate.now().toString(),
    val dryness: Int = 2,
    val oiliness: Int = 2,
    val redness: Int = 1,
    val trouble: Int = 1,
    val sleepHours: String = "7.0",
    val memo: String = "",
    val productSearchQuery: String = "",
    val productSearchResults: List<ProductDto> = emptyList(),
    val userProducts: List<UserProductDto> = emptyList(),
    val selectedUserProductIds: Set<String> = emptySet(),
    val presets: List<ProductPresetDto> = emptyList(),
    val appliedPresetIds: Set<String> = emptySet(),
    val presetName: String = "",
    val facePhoto: FacePhotoUpload? = null,
    val todayRecord: DailyRecordDto? = null,
    val message: String? = null
)
