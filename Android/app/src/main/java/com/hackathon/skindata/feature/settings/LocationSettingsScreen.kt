package com.hackathon.skindata.feature.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
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
        onSelectLocation = viewModel::selectLocation,
        onSave = { viewModel.save(accessToken) }
    )
}

@Composable
fun LocationSettingsScreen(
    uiState: LocationSettingsUiState,
    onSelectLocation: (String) -> Unit,
    onSave: () -> Unit
) {
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
                uiState.options.chunked(2).forEach { rowOptions ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        rowOptions.forEach { option ->
                            val selected = option.id == uiState.selectedLocationId
                            LocationOptionButton(
                                option = option,
                                selected = selected,
                                onClick = { onSelectLocation(option.id) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        if (rowOptions.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }

            uiState.message?.let {
                Text(text = it, style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.height(8.dp))
            }

            Button(
                onClick = onSave,
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isSaving && !uiState.isLoading
            ) {
                Text(if (uiState.isSaving) "저장 중" else "지역 저장")
            }
        }
    }
}

@Composable
private fun LocationOptionButton(
    option: LocationOptionDto,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (selected) {
        Button(onClick = onClick, modifier = modifier) {
            Text(option.regionLabel)
        }
    } else {
        OutlinedButton(onClick = onClick, modifier = modifier) {
            Text(option.regionLabel)
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
                selectedLocationId = "seoul-gangnam"
            ),
            onSelectLocation = {},
            onSave = {}
        )
    }
}
