package com.hackathon.skindata.feature.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
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

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "지역 설정", style = MaterialTheme.typography.titleMedium)
            Text(
                text = "오늘 기록 저장 시 가장 가까운 시각의 기상청 관측값을 함께 저장합니다.",
                style = MaterialTheme.typography.bodySmall
            )

            Spacer(modifier = Modifier.height(10.dp))

            uiState.savedLocation?.let {
                AssistChip(
                    onClick = {},
                    label = {
                        Text("${it.regionLabel} · ${it.weatherStationName} 관측소")
                    }
                )
            } ?: Text(text = "아직 지역을 설정하지 않았습니다.", style = MaterialTheme.typography.bodySmall)

            Spacer(modifier = Modifier.height(10.dp))

            if (uiState.isLoading) {
                CircularProgressIndicator()
            } else {
                Text(text = "도/광역시", style = MaterialTheme.typography.labelMedium)
                Spacer(modifier = Modifier.height(6.dp))
                groupedOptions.keys.chunked(2).forEach { rowOptions ->
                    LocationOptionRow {
                        rowOptions.forEach { provinceLabel ->
                            LocationTextButton(
                                label = provinceLabel,
                                selected = provinceLabel == selectedProvinceLabel,
                                onClick = { onSelectProvince(provinceLabel) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        repeat(2 - rowOptions.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                Text(text = "시/군/구", style = MaterialTheme.typography.labelMedium)
                Spacer(modifier = Modifier.height(6.dp))
                cityOptions.chunked(2).forEach { rowOptions ->
                    LocationOptionRow {
                        rowOptions.forEach { option ->
                            LocationTextButton(
                                label = option.cityLabel(),
                                selected = option.id == uiState.selectedLocationId,
                                onClick = { onSelectLocation(option.id) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        repeat(2 - rowOptions.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }

            uiState.message?.let {
                Text(text = it, style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.height(8.dp))
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
}

@Composable
private fun LocationOptionRow(content: @Composable RowScope.() -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        content = content
    )
}

@Composable
private fun LocationTextButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (selected) {
        Button(onClick = onClick, modifier = modifier) {
            Text(label)
        }
    } else {
        OutlinedButton(onClick = onClick, modifier = modifier) {
            Text(label)
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
