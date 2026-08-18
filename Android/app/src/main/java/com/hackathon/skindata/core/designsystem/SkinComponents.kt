package com.hackathon.skindata.core.designsystem

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun SectionHeader(
    title: String,
    description: String? = null,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(text = title, style = MaterialTheme.typography.headlineSmall)
        description?.let {
            Spacer(modifier = Modifier.height(SkinSpacing.Compact))
            Text(text = it, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun InfoCard(
    title: String,
    body: String,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(SkinSpacing.Card)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(SkinSpacing.Compact))
            Text(text = body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun StatusText(
    message: String?,
    modifier: Modifier = Modifier
) {
    message?.let {
        Text(
            text = it,
            modifier = modifier,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}
