package com.hackathon.skindata.feature.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.core.designsystem.AppCard
import com.hackathon.skindata.core.designsystem.SkinColors
import com.hackathon.skindata.core.designsystem.SkinOutlinedButton as OutlinedButton
import com.hackathon.skindata.core.designsystem.SkinPrimaryButton as Button
import com.hackathon.skindata.core.network.LocationOptionDto
import com.hackathon.skindata.ui.theme.SkinDataTheme

@Composable
fun LocationSettingsRoute(
    accessToken: String,
    viewModel: LocationSettingsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(accessToken) {
        viewModel.load(accessToken)
    }

    LocationSettingsScreen(
        uiState = uiState,
        onSelectProvince = viewModel::selectProvince,
        onSelectLocation = viewModel::selectLocation,
        onSave = { viewModel.save(accessToken) }
    )
}

@Composable
fun LocationSettingsScreen(
    uiState: LocationSettingsUiState,
    onSelectProvince: (String) -> Unit,
    onSelectLocation: (String) -> Unit,
    onSave: () -> Unit
) {
    val groupedOptions = uiState.options.groupBy { it.provinceLabel() }
    val selectedProvinceLabel = uiState.selectedProvinceLabel ?: groupedOptions.keys.firstOrNull()
    val cityOptions = selectedProvinceLabel?.let { groupedOptions[it] }.orEmpty()
    val selectedCityLabel = cityOptions.firstOrNull { it.id == uiState.selectedLocationId }?.cityLabel()

    AppCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 12.dp)
    ) {
        Text(text = "지역 설정", style = MaterialTheme.typography.titleMedium)
        Text(
            text = "오늘 기록 저장 시 가까운 기상청 관측값을 함께 저장합니다.",
            style = MaterialTheme.typography.bodySmall
        )

        uiState.savedLocation?.let {
            AssistChip(
                onClick = {},
                label = {
                    Text("${it.regionLabel} · ${it.weatherStationName} 관측소")
                }
            )
        } ?: Text(text = "아직 지역을 설정하지 않았습니다.", style = MaterialTheme.typography.bodySmall)

        if (uiState.isLoading) {
            CircularProgressIndicator()
        } else {
            LocationDropdown(
                label = "시/도",
                selectedText = selectedProvinceLabel ?: "시/도 선택",
                options = groupedOptions.keys.toList(),
                onSelected = onSelectProvince
            )
            LocationDropdown(
                label = "시/군/구",
                selectedText = selectedCityLabel ?: "시/군/구 선택",
                options = cityOptions.map { it.cityLabel() },
                onSelected = { cityLabel ->
                    cityOptions.firstOrNull { it.cityLabel() == cityLabel }?.let { onSelectLocation(it.id) }
                }
            )
        }

        uiState.message?.let {
            Text(text = it, style = MaterialTheme.typography.bodySmall)
            Spacer(modifier = Modifier.height(2.dp))
        }

        Button(
            onClick = onSave,
            modifier = Modifier.fillMaxWidth(),
            enabled = !uiState.isSaving && !uiState.isLoading && uiState.selectedLocationId != null
        ) {
            Text(if (uiState.isSaving) "저장 중" else "지역 저장")
        }
    }
}

@Composable
private fun LocationDropdown(
    label: String,
    selectedText: String,
    options: List<String>,
    onSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text = label, style = MaterialTheme.typography.labelMedium)
        Box(modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = { expanded = true },
                modifier = Modifier.fillMaxWidth(),
                enabled = options.isNotEmpty()
            ) {
                Text(selectedText)
            }
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 22.dp)
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option, color = SkinColors.Ink) },
                        onClick = {
                            expanded = false
                            onSelected(option)
                        }
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun LocationSettingsScreenPreview() {
    SkinDataTheme {
        LocationSettingsScreen(
            uiState = LocationSettingsUiState(
                options = listOf(
                    LocationOptionDto("seoul-gangnam", "서울특별시 강남구", 108, "서울"),
                    LocationOptionDto("gyeonggi-suwon", "경기도 수원시", 119, "수원")
                ),
                selectedProvinceLabel = "서울특별시",
                selectedLocationId = "seoul-gangnam"
            ),
            onSelectProvince = {},
            onSelectLocation = {},
            onSave = {}
        )
    }
}
