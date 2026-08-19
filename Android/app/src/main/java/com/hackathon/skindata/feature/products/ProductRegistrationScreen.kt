package com.hackathon.skindata.feature.products

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hackathon.skindata.core.designsystem.AppCard
import com.hackathon.skindata.core.designsystem.AppTextField
import com.hackathon.skindata.core.designsystem.SectionHeader
import com.hackathon.skindata.core.designsystem.SkinColors
import com.hackathon.skindata.core.designsystem.SkinOutlinedButton as OutlinedButton
import com.hackathon.skindata.core.designsystem.SkinPrimaryButton as Button
import com.hackathon.skindata.core.network.FacePhotoUpload
import com.hackathon.skindata.core.network.ProductDto
import com.hackathon.skindata.core.network.ProductIngredientDto
import com.hackathon.skindata.core.network.UserProductDto
import com.hackathon.skindata.ui.theme.SkinDataTheme

private const val WATER_KO = "정제수"

@Composable
fun ProductRegistrationRoute(
    accessToken: String,
    modifier: Modifier = Modifier,
    viewModel: ProductRegistrationViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(accessToken) {
        viewModel.loadUserProducts(accessToken)
    }

    ProductRegistrationScreen(
        uiState = uiState,
        modifier = modifier,
        onQueryChanged = viewModel::onQueryChanged,
        onReactionMemoChanged = viewModel::onReactionMemoChanged,
        onSearch = viewModel::search,
        onSelectProduct = viewModel::selectProduct,
        onSaveSelectedProduct = { viewModel.saveSelectedProduct(accessToken) },
        onShowDirectSubmission = viewModel::showDirectSubmission,
        onUsageStatusChange = { userProductId, usageStatus ->
            viewModel.updateUsageStatus(accessToken, userProductId, usageStatus)
        },
        onSubmissionItemTypeSelected = viewModel::selectSubmissionItemType,
        onSubmissionNameChanged = viewModel::onSubmissionNameChanged,
        onSubmissionBrandChanged = viewModel::onSubmissionBrandChanged,
        onSubmissionIngredientsChanged = viewModel::onSubmissionIngredientsChanged,
        onSubmissionPhotoSelected = viewModel::setSubmissionPhoto,
        onExtractSubmission = { viewModel.extractSubmission(accessToken) },
        onConfirmSubmission = { viewModel.confirmSubmission(accessToken) }
    )
}

@Composable
fun ProductRegistrationScreen(
    uiState: ProductRegistrationUiState,
    modifier: Modifier = Modifier,
    onQueryChanged: (String) -> Unit,
    onReactionMemoChanged: (String) -> Unit,
    onSearch: () -> Unit,
    onSelectProduct: (ProductDto) -> Unit,
    onSaveSelectedProduct: () -> Unit,
    onShowDirectSubmission: () -> Unit,
    onUsageStatusChange: (String, String) -> Unit,
    onSubmissionItemTypeSelected: (ProductItemType) -> Unit,
    onSubmissionNameChanged: (String) -> Unit,
    onSubmissionBrandChanged: (String) -> Unit,
    onSubmissionIngredientsChanged: (String) -> Unit,
    onSubmissionPhotoSelected: (FacePhotoUpload?) -> Unit,
    onExtractSubmission: () -> Unit,
    onConfirmSubmission: () -> Unit
) {
    val context = LocalContext.current
    val labelPhotoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        onSubmissionPhotoSelected(uri?.toLabelPhotoUpload(context))
    }
    val currentProducts = uiState.userProducts.filter { it.usageStatus == "current" }
    val pastProducts = uiState.userProducts.filter { it.usageStatus != "current" }

    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            SectionHeader(
                title = "제품",
                description = null
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AppTextField(
                    value = uiState.query,
                    onValueChange = onQueryChanged,
                    modifier = Modifier.weight(1f),
                    label = "제품명, 브랜드, 카테고리",
                    singleLine = true,
                    enabled = !uiState.isLoading
                )
                Button(
                    onClick = onSearch,
                    modifier = Modifier.padding(top = 2.dp),
                    enabled = !uiState.isLoading
                ) {
                    Text("검색")
                }
            }
        }

        uiState.message?.let { message ->
            item {
                Text(text = message, style = MaterialTheme.typography.bodyMedium)
            }
        }

        if (uiState.isLoading) {
            item {
                CircularProgressIndicator()
            }
        }

        if (uiState.searchResults.isNotEmpty()) {
            item {
                Text(text = "검색 결과", style = MaterialTheme.typography.titleMedium)
            }
            items(uiState.searchResults, key = { it.id }) { product ->
                ProductCard(
                    product = product,
                    isSelected = uiState.selectedProduct?.id == product.id,
                    onClick = { onSelectProduct(product) }
                )
            }
        }

        uiState.selectedProduct?.let { product ->
            item {
                AppCard(containerColor = SkinColors.Surface) {
                    Text(text = "선택한 제품", style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = "${product.brand} · ${product.name}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    AppTextField(
                        value = uiState.reactionMemo,
                        onValueChange = onReactionMemoChanged,
                        label = "기억나는 반응 메모",
                        minLines = 2,
                        maxLines = 4
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Button(
                        onClick = onSaveSelectedProduct,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !uiState.isSaving
                    ) {
                        Text(if (uiState.isSaving) "저장 중" else "이전 사용 제품으로 저장")
                    }
                }
            }
        }

        if (uiState.hasSearched && !uiState.isLoading) {
            item {
                OutlinedButton(
                    onClick = onShowDirectSubmission,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("찾는 제품 없음")
                }
            }
        }

        if (uiState.isDirectSubmissionExpanded) {
            item {
                DirectProductSubmissionCard(
                    uiState = uiState,
                    onItemTypeSelected = onSubmissionItemTypeSelected,
                    onNameChanged = onSubmissionNameChanged,
                    onBrandChanged = onSubmissionBrandChanged,
                    onIngredientsChanged = onSubmissionIngredientsChanged,
                    onPickPhoto = { labelPhotoPicker.launch("image/*") },
                    onExtract = onExtractSubmission,
                    onConfirm = onConfirmSubmission
                )
            }
        }

        item {
            Text(text = "사용중", style = MaterialTheme.typography.titleMedium)
        }

        if (currentProducts.isEmpty()) {
            item {
                Text(
                    text = "사용중인 제품이 없습니다.",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        } else {
            items(currentProducts, key = { it.id }) { userProduct ->
                UserProductCard(
                    userProduct = userProduct,
                    actionLabel = "과거 사용으로",
                    onAction = { onUsageStatusChange(userProduct.id, "past") }
                )
            }
        }

        item {
            Text(text = "과거 사용", style = MaterialTheme.typography.titleMedium)
        }

        if (pastProducts.isEmpty()) {
            item {
                Text(
                    text = "과거 사용 제품이 없습니다.",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        } else {
            items(pastProducts, key = { it.id }) { userProduct ->
                UserProductCard(
                    userProduct = userProduct,
                    actionLabel = "사용중으로",
                    onAction = { onUsageStatusChange(userProduct.id, "current") }
                )
            }
        }
    }
}

@Composable
private fun DirectProductSubmissionCard(
    uiState: ProductRegistrationUiState,
    onItemTypeSelected: (ProductItemType) -> Unit,
    onNameChanged: (String) -> Unit,
    onBrandChanged: (String) -> Unit,
    onIngredientsChanged: (String) -> Unit,
    onPickPhoto: () -> Unit,
    onExtract: () -> Unit,
    onConfirm: () -> Unit
) {
    AppCard {
        Text(text = "제품 직접 등록", style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ProductItemType.entries.forEach { itemType ->
                FilterChip(
                    selected = uiState.submissionItemType == itemType,
                    onClick = { onItemTypeSelected(itemType) },
                    label = { Text(itemType.label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = SkinColors.PrimaryOliveSoft,
                        selectedLabelColor = SkinColors.Ink,
                        containerColor = SkinColors.Surface,
                        labelColor = SkinColors.TextSecondary
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = uiState.submissionItemType == itemType,
                        borderColor = SkinColors.Border,
                        selectedBorderColor = SkinColors.PrimaryOlive
                    )
                )
            }
        }
        AppTextField(
            value = uiState.submissionName,
            onValueChange = onNameChanged,
            label = "제품명",
            singleLine = true
        )
        AppTextField(
            value = uiState.submissionBrand,
            onValueChange = onBrandChanged,
            label = "브랜드",
            singleLine = true
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onPickPhoto, enabled = !uiState.isLoading) {
                Text(if (uiState.submissionPhoto == null) "사진 선택" else "사진 다시 선택")
            }
            Button(onClick = onExtract, enabled = !uiState.isLoading && uiState.submissionPhoto != null) {
                Text(if (uiState.isLoading) "추출 중" else "AI 추출")
            }
        }
        uiState.submissionPhoto?.let {
            Text(text = "${it.fileName} 선택됨", style = MaterialTheme.typography.bodySmall)
        }
        AppTextField(
            value = uiState.submissionIngredientsText,
            onValueChange = onIngredientsChanged,
            label = "확정 성분/원료 텍스트",
            minLines = 4,
            maxLines = 8
        )
        Spacer(modifier = Modifier.height(4.dp))
        Button(
            onClick = onConfirm,
            modifier = Modifier.fillMaxWidth(),
            enabled = !uiState.isSaving
        ) {
            Text(if (uiState.isSaving) "등록 중" else "내 제품에 등록")
        }
    }
}

@Composable
private fun ProductCard(
    product: ProductDto,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    AppCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        containerColor = if (isSelected) SkinColors.PrimaryOliveSoft else SkinColors.Surface
    ) {
        ProductMeta(product = product)
        Text(
            text = product.name,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Text(text = representativeIngredients(product), style = MaterialTheme.typography.bodySmall)
        if (isSelected) {
            AssistChip(onClick = onClick, label = { Text("선택됨") })
        }
    }
}

@Composable
private fun UserProductCard(
    userProduct: UserProductDto,
    actionLabel: String,
    onAction: () -> Unit
) {
    AppCard(containerColor = SkinColors.Surface) {
        ProductMeta(product = userProduct.product)
        Text(
            text = userProduct.product.name,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Text(text = representativeIngredients(userProduct.product), style = MaterialTheme.typography.bodySmall)
        userProduct.pastReactionMemo?.takeIf { it.isNotBlank() }?.let {
            Text(text = "메모: $it", style = MaterialTheme.typography.bodyMedium)
        }
        OutlinedButton(onClick = onAction) {
            Text(actionLabel)
        }
    }
}

@Composable
private fun ProductMeta(product: ProductDto) {
    Text(
        text = listOfNotNull(product.brand, product.category).joinToString(" · "),
        style = MaterialTheme.typography.bodySmall
    )
}

private fun representativeIngredients(product: ProductDto): String {
    val ingredients = product.ingredients
        .map { it.name.trim() }
        .filter { it.isNotBlank() && it != WATER_KO }
        .distinct()
        .take(5)

    return if (ingredients.isEmpty()) {
        "대표 전성분 정보가 아직 없습니다."
    } else {
        "대표 전성분: ${ingredients.joinToString(", ")}"
    }
}

private fun Uri.toLabelPhotoUpload(context: Context): FacePhotoUpload? {
    val contentResolver = context.contentResolver
    val contentType = contentResolver.getType(this) ?: return null
    if (contentType != "image/jpeg" && contentType != "image/png") {
        return null
    }

    val bytes = contentResolver.openInputStream(this)?.use { it.readBytes() } ?: return null
    val fileName = contentResolver.query(this, null, null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (cursor.moveToFirst() && nameIndex >= 0) cursor.getString(nameIndex) else null
    } ?: if (contentType == "image/png") "ingredient-label.png" else "ingredient-label.jpg"

    return FacePhotoUpload(
        fileName = fileName,
        contentType = contentType,
        bytes = bytes
    )
}

@Preview(showBackground = true)
@Composable
private fun ProductRegistrationScreenPreview() {
    SkinDataTheme {
        ProductRegistrationScreen(
            uiState = ProductRegistrationUiState(
                query = "크림",
                searchResults = listOf(
                    ProductDto(
                        id = "product-id",
                        source = "seed",
                        verificationStatus = "verified",
                        name = "보습 크림",
                        brand = "Demo",
                        category = "크림",
                        ingredients = listOf(
                            ProductIngredientDto("정제수", "정제수", null, "unmatched"),
                            ProductIngredientDto("글리세린", "글리세린", null, "unmatched")
                        )
                    )
                )
            ),
            onQueryChanged = {},
            onReactionMemoChanged = {},
            onSearch = {},
            onSelectProduct = {},
            onSaveSelectedProduct = {},
            onShowDirectSubmission = {},
            onUsageStatusChange = { _, _ -> },
            onSubmissionItemTypeSelected = {},
            onSubmissionNameChanged = {},
            onSubmissionBrandChanged = {},
            onSubmissionIngredientsChanged = {},
            onSubmissionPhotoSelected = {},
            onExtractSubmission = {},
            onConfirmSubmission = {}
        )
    }
}
