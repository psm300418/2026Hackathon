package com.hackathon.skindata.feature.settings

import com.hackathon.skindata.core.network.LocationOptionDto
import com.hackathon.skindata.core.network.UserLocationDto

data class LocationSettingsUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val options: List<LocationOptionDto> = emptyList(),
    val selectedProvinceLabel: String? = null,
    val selectedLocationId: String? = null,
    val savedLocation: UserLocationDto? = null,
    val message: String? = null
)

internal fun LocationOptionDto.provinceLabel(): String = regionLabel.substringBefore(" ")

internal fun LocationOptionDto.cityLabel(): String = regionLabel.substringAfter(" ", regionLabel)
