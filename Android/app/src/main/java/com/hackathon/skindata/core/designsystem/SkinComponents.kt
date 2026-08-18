package com.hackathon.skindata.core.designsystem

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp

@Composable
fun SkinPrimaryButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.heightIn(min = 52.dp),
        enabled = enabled,
        shape = RoundedCornerShape(SkinRadius.Button),
        colors = ButtonDefaults.buttonColors(
            containerColor = SkinColors.PrimaryOlive,
            contentColor = SkinColors.Ink,
            disabledContainerColor = SkinColors.SurfaceSoft,
            disabledContentColor = SkinColors.Muted
        ),
        contentPadding = ButtonDefaults.ContentPadding,
        content = content
    )
}

@Composable
fun SkinOutlinedButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable RowScope.() -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = 52.dp),
        enabled = enabled,
        shape = RoundedCornerShape(SkinRadius.Button),
        border = BorderStroke(1.dp, SkinColors.Border),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = SkinColors.Surface,
            contentColor = SkinColors.Ink,
            disabledContentColor = SkinColors.Muted
        ),
        content = content
    )
}

@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    containerColor: Color = SkinColors.SurfaceSoft,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(SkinRadius.Card),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, SkinColors.Border)
    ) {
        Column(
            modifier = Modifier.padding(SkinSpacing.Card),
            verticalArrangement = Arrangement.spacedBy(SkinSpacing.Compact),
            content = content
        )
    }
}

@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    singleLine: Boolean = false,
    minLines: Int = 1,
    maxLines: Int = Int.MAX_VALUE,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        enabled = enabled,
        singleLine = singleLine,
        minLines = minLines,
        maxLines = maxLines,
        keyboardOptions = keyboardOptions,
        visualTransformation = visualTransformation,
        label = { Text(label) },
        shape = RoundedCornerShape(SkinRadius.Field),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = SkinColors.PrimaryOlive,
            unfocusedBorderColor = SkinColors.Border,
            focusedContainerColor = SkinColors.Surface,
            unfocusedContainerColor = SkinColors.Surface,
            disabledContainerColor = SkinColors.SurfaceSoft,
            focusedLabelColor = SkinColors.TextSecondary,
            unfocusedLabelColor = SkinColors.Muted,
            focusedTextColor = SkinColors.Ink,
            unfocusedTextColor = SkinColors.Ink
        )
    )
}

@Composable
fun AppPill(
    text: String,
    selected: Boolean,
    modifier: Modifier = Modifier
) {
    Text(
        text = text,
        modifier = modifier
            .background(
                color = if (selected) SkinColors.PrimaryOliveSoft else SkinColors.Surface,
                shape = RoundedCornerShape(SkinRadius.Pill)
            )
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .widthIn(min = 42.dp),
        style = MaterialTheme.typography.labelMedium,
        color = if (selected) SkinColors.Ink else SkinColors.TextSecondary
    )
}

@Composable
fun SectionHeader(
    title: String,
    description: String? = null,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(text = title, style = MaterialTheme.typography.headlineMedium)
        description?.let {
            Spacer(modifier = Modifier.height(SkinSpacing.Compact))
            Text(text = it, style = MaterialTheme.typography.bodyMedium, color = SkinColors.TextSecondary)
        }
    }
}

@Composable
fun InfoCard(
    title: String,
    body: String,
    modifier: Modifier = Modifier
) {
    AppCard(modifier = modifier) {
        Text(text = title, style = MaterialTheme.typography.titleMedium)
        Text(text = body, style = MaterialTheme.typography.bodyMedium)
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
