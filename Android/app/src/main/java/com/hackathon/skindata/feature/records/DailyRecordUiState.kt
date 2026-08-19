package com.hackathon.skindata.feature.records

import com.hackathon.skindata.core.network.DailyRecordDto
import com.hackathon.skindata.core.network.DailyRecordTrendsDto
import com.hackathon.skindata.core.network.FacePhotoUpload
import com.hackathon.skindata.core.network.ProductDto
import com.hackathon.skindata.core.network.ProductPresetDto
import com.hackathon.skindata.core.network.UserLocationDto
import com.hackathon.skindata.core.network.UserProductDto
import java.time.LocalDate
import java.time.ZoneId

private val seoulZoneId: ZoneId = ZoneId.of("Asia/Seoul")
private fun todayInSeoul(): LocalDate = LocalDate.now(seoulZoneId)

data class DailyRecordUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val selectedMode: DailyRecordMode = DailyRecordMode.Today,
    val recordDate: String = todayInSeoul().toString(),
    val historyFromDate: String = todayInSeoul().minusDays(13).toString(),
    val historyToDate: String = todayInSeoul().toString(),
    val dryness: Int = 2,
    val oiliness: Int = 2,
    val redness: Int = 1,
    val trouble: Int = 1,
    val sleepHours: String = "7.0",
    val outdoorMinutes: String = "0",
    val memo: String = "",
    val productSearchQuery: String = "",
    val productSearchResults: List<ProductDto> = emptyList(),
    val userProducts: List<UserProductDto> = emptyList(),
    val userLocation: UserLocationDto? = null,
    val selectedUserProductIds: Set<String> = emptySet(),
    val presets: List<ProductPresetDto> = emptyList(),
    val appliedPresetIds: Set<String> = emptySet(),
    val presetName: String = "",
    val facePhoto: FacePhotoUpload? = null,
    val todayRecord: DailyRecordDto? = null,
    val historyRecords: List<DailyRecordDto> = emptyList(),
    val trends: DailyRecordTrendsDto? = null,
    val message: String? = null
)

enum class DailyRecordMode {
    Today,
    History,
    Trends
}
