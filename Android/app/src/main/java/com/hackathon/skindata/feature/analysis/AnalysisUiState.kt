package com.hackathon.skindata.feature.analysis

import com.hackathon.skindata.core.network.AnalysisResultDto

data class AnalysisUiState(
    val isLoading: Boolean = true,
    val isRunning: Boolean = false,
    val latestAnalysis: AnalysisResultDto? = null,
    val message: String? = null
)
