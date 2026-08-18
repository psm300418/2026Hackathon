package com.hackathon.skindata.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hackathon.skindata.core.network.BackendApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LocationSettingsViewModel(
    private val backendApiClient: BackendApiClient = BackendApiClient()
) : ViewModel() {
    private val _uiState = MutableStateFlow(LocationSettingsUiState())
    val uiState: StateFlow<LocationSettingsUiState> = _uiState.asStateFlow()

    fun load(accessToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, message = null) }

            runCatching {
                val options = backendApiClient.getLocationOptions().items
                val savedLocation = backendApiClient.getMyLocation(accessToken)
                options to savedLocation
            }.onSuccess { (options, savedLocation) ->
                val selectedOption = options.firstOrNull {
                    it.weatherStationId == savedLocation?.weatherStationId &&
                        it.regionLabel == savedLocation.regionLabel
                }
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        options = options,
                        savedLocation = savedLocation,
                        selectedLocationId = selectedOption?.id,
                        message = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        message = error.message ?: "지역 정보를 불러오지 못했습니다."
                    )
                }
            }
        }
    }

    fun selectLocation(locationId: String) {
        _uiState.update { it.copy(selectedLocationId = locationId, message = null) }
    }

    fun save(accessToken: String) {
        val locationId = _uiState.value.selectedLocationId

        if (locationId == null) {
            _uiState.update { it.copy(message = "지역을 먼저 선택해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, message = null) }

            runCatching {
                backendApiClient.saveMyLocation(accessToken, locationId)
            }.onSuccess { location ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        savedLocation = location,
                        message = "지역 설정을 저장했습니다."
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        message = error.message ?: "지역 설정 저장에 실패했습니다."
                    )
                }
            }
        }
    }
}
