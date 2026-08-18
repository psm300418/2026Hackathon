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
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
        onSubmissionItemTypeSelected = viewModel::selectSubmissionItemType,
        onSubmissionNameChanged = viewModel::onSubmissionNameChanged,
        onSubmissionBrandChanged = viewModel::onSubmissionBrandChanged,
        onSubmissionCategoryChanged = viewModel::onSubmissionCategoryChanged,
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
    onSubmissionItemTypeSelected: (ProductItemType) -> Unit,
    onSubmissionNameChanged: (String) -> Unit,
    onSubmissionBrandChanged: (String) -> Unit,
    onSubmissionCategoryChanged: (String) -> Unit,
    onSubmissionIngredientsChanged: (String) -> Unit,
    onSubmissionPhotoSelected: (FacePhotoUpload?) -> Unit,
    onExtractSubmission: () -> Unit,
    onConfirmSubmission: () -> Unit
) {
    val context = LocalContext.current
    val labelPhotoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        onSubmissionPhotoSelected(uri?.toLabelPhotoUpload(context))
    }

    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(
                text = "이전 사용 제품",
                style = MaterialTheme.typography.headlineSmall
            )
            Text(
                text = "써본 제품을 검색해서 저장해두면 이후 기록 분석의 참고 데이터가 됩니다.",
                style = MaterialTheme.typography.bodyMedium
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = uiState.query,
                    onValueChange = onQueryChanged,
                    modifier = Modifier.weight(1f),
                    label = { Text("제품명, 브랜드, 카테고리") },
                    singleLine = true,
                    enabled = !uiState.isLoading
                )
                Button(
                    onClick = onSearch,
                    modifier = Modifier.padding(top = 8.dp),
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
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "선택한 제품",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "${product.brand} · ${product.name}",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = uiState.reactionMemo,
                            onValueChange = onReactionMemoChanged,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("기억나는 반응 메모") },
                            minLines = 2,
                            maxLines = 4
                        )
                        Spacer(modifier = Modifier.height(12.dp))
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
        }

        item {
            DirectProductSubmissionCard(
                uiState = uiState,
                onItemTypeSelected = onSubmissionItemTypeSelected,
                onNameChanged = onSubmissionNameChanged,
                onBrandChanged = onSubmissionBrandChanged,
                onCategoryChanged = onSubmissionCategoryChanged,
                onIngredientsChanged = onSubmissionIngredientsChanged,
                onPickPhoto = { labelPhotoPicker.launch("image/*") },
                onExtract = onExtractSubmission,
                onConfirm = onConfirmSubmission
            )
        }

        item {
            Text(text = "내 제품 목록", style = MaterialTheme.typography.titleMedium)
        }

        if (uiState.userProducts.isEmpty()) {
            item {
                Text(
                    text = "아직 저장한 제품이 없습니다.",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        } else {
            items(uiState.userProducts, key = { it.id }) { userProduct ->
                UserProductCard(userProduct = userProduct)
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
    onCategoryChanged: (String) -> Unit,
    onIngredientsChanged: (String) -> Unit,
    onPickPhoto: () -> Unit,
    onExtract: () -> Unit,
    onConfirm: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "제품 직접 등록", style = MaterialTheme.typography.titleMedium)
            Text(
                text = "검색해서 나오지 않는 제품은 성분표나 라벨 사진에서 후보 텍스트를 추출한 뒤 확인하고 저장합니다.",
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(modifier = Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProductItemType.entries.forEach { itemType ->
                    AssistChip(
                        onClick = { onItemTypeSelected(itemType) },
                        label = {
                            Text(if (uiState.submissionItemType == itemType) "${itemType.label} 선택됨" else itemType.label)
                        }
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = uiState.submissionName,
                onValueChange = onNameChanged,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("제품명") },
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = uiState.submissionBrand,
                onValueChange = onBrandChanged,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("브랜드") },
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = uiState.submissionCategory,
                onValueChange = onCategoryChanged,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("카테고리") },
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))
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
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = uiState.submissionIngredientsText,
                onValueChange = onIngredientsChanged,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("확정 성분/원료 텍스트") },
                minLines = 4,
                maxLines = 8
            )
            Spacer(modifier = Modifier.height(10.dp))
            Button(
                onClick = onConfirm,
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isSaving
            ) {
                Text(if (uiState.isSaving) "등록 중" else "내 제품에 등록")
            }
        }
    }
}

@Composable
private fun ProductCard(
    product: ProductDto,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            ProductMeta(product = product)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = product.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(text = representativeIngredients(product), style = MaterialTheme.typography.bodySmall)
            if (isSelected) {
                Spacer(modifier = Modifier.height(8.dp))
                AssistChip(onClick = onClick, label = { Text("선택됨") })
            }
        }
    }
}

@Composable
private fun UserProductCard(userProduct: UserProductDto) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            ProductMeta(product = userProduct.product)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = userProduct.product.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(text = representativeIngredients(userProduct.product), style = MaterialTheme.typography.bodySmall)
            userProduct.pastReactionMemo?.takeIf { it.isNotBlank() }?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = "메모: $it", style = MaterialTheme.typography.bodyMedium)
            }
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
            onSubmissionItemTypeSelected = {},
            onSubmissionNameChanged = {},
            onSubmissionBrandChanged = {},
            onSubmissionCategoryChanged = {},
            onSubmissionIngredientsChanged = {},
            onSubmissionPhotoSelected = {},
            onExtractSubmission = {},
            onConfirmSubmission = {}
        )
    }
}
