package com.hackathon.skindata.core.network

import com.hackathon.skindata.BuildConfig
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.UUID

class BackendApiClient(
    private val baseUrl: String = BuildConfig.BACKEND_BASE_URL,
    private val json: Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }
) {
    suspend fun getMyProfile(accessToken: String): ProfileDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/profile/me",
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<ProfileDto>>(body).data
    }

    suspend fun getSkinTypeQuestions(): SkinTypeQuestionsDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/onboarding/skin-type/questions",
            method = "GET",
            accessToken = null
        )

        json.decodeFromString<ApiResponse<SkinTypeQuestionsDto>>(body).data
    }

    suspend fun submitSkinTypeResponses(
        accessToken: String,
        questionnaireVersion: String,
        responses: List<SkinTypeResponseInput>
    ): SkinTypeResultDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/onboarding/skin-type/responses",
            method = "POST",
            accessToken = accessToken,
            requestBody = json.encodeToString(
                SubmitSkinTypeResponsesRequest(
                    questionnaireVersion = questionnaireVersion,
                    responses = responses
                )
            )
        )

        json.decodeFromString<ApiResponse<SkinTypeResultDto>>(body).data
    }

    suspend fun getSkinTypeResult(accessToken: String): SkinTypeResultDto? = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/onboarding/skin-type/result",
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<SkinTypeResultDto?>>(body).data
    }

    suspend fun searchProducts(query: String): ProductSearchDto = withContext(Dispatchers.IO) {
        val encodedQuery = URLEncoder.encode(query, Charsets.UTF_8.name())
        val body = request(
            path = "/api/products/search?q=$encodedQuery",
            method = "GET",
            accessToken = null
        )

        json.decodeFromString<ApiResponse<ProductSearchDto>>(body).data
    }

    suspend fun getUserProducts(accessToken: String): UserProductsDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/user-products",
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<UserProductsDto>>(body).data
    }

    suspend fun savePastUserProduct(
        accessToken: String,
        productId: String,
        pastReactionMemo: String
    ): UserProductDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/user-products",
            method = "POST",
            accessToken = accessToken,
            requestBody = json.encodeToString(
                SaveUserProductRequest(
                    productId = productId,
                    usageStatus = "past",
                    isPastExperience = true,
                    pastReactionMemo = pastReactionMemo.ifBlank { null },
                    memo = null
                )
            )
        )

        json.decodeFromString<ApiResponse<UserProductDto>>(body).data
    }

    suspend fun getProductPresets(accessToken: String): ProductPresetsDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/product-presets",
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<ProductPresetsDto>>(body).data
    }

    suspend fun saveProductPreset(
        accessToken: String,
        name: String,
        userProductIds: List<String>
    ): ProductPresetDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/product-presets",
            method = "POST",
            accessToken = accessToken,
            requestBody = json.encodeToString(
                SaveProductPresetRequest(
                    name = name,
                    userProductIds = userProductIds
                )
            )
        )

        json.decodeFromString<ApiResponse<ProductPresetDto>>(body).data
    }

    suspend fun getDailyRecords(accessToken: String): DailyRecordsDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/daily-records",
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<DailyRecordsDto>>(body).data
    }

    suspend fun saveDailyRecord(
        accessToken: String,
        request: SaveDailyRecordRequest,
        facePhoto: FacePhotoUpload?
    ): DailyRecordDto = withContext(Dispatchers.IO) {
        val fields = mapOf(
            "recordDate" to request.recordDate,
            "dryness" to request.dryness.toString(),
            "oiliness" to request.oiliness.toString(),
            "redness" to request.redness.toString(),
            "trouble" to request.trouble.toString(),
            "sleepHours" to request.sleepHours.toString(),
            "userProductIds" to json.encodeToString(request.userProductIds),
            "appliedPresetIds" to json.encodeToString(request.appliedPresetIds),
            "memo" to request.memo.orEmpty()
        )
        val body = multipartRequest(
            path = "/api/daily-records",
            method = "POST",
            accessToken = accessToken,
            fields = fields,
            file = facePhoto
        )

        json.decodeFromString<ApiResponse<DailyRecordDto>>(body).data
    }

    private fun request(
        path: String,
        method: String,
        accessToken: String?,
        requestBody: String? = null
    ): String {
        val endpoint = URL("${baseUrl.trimEnd('/')}${path}")
        val connection = endpoint.openConnection() as HttpURLConnection

        try {
            connection.requestMethod = method
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.setRequestProperty("Accept", "application/json")

            if (accessToken != null) {
                connection.setRequestProperty("Authorization", "Bearer $accessToken")
            }

            if (requestBody != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { outputStream ->
                    outputStream.write(requestBody.toByteArray(Charsets.UTF_8))
                }
            }

            val responseCode = connection.responseCode
            val response = if (responseCode in 200..299) {
                connection.inputStream.bufferedReader().use { it.readText() }
            } else {
                connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
            }

            if (responseCode !in 200..299) {
                throw IllegalStateException("Backend request failed: $responseCode $response")
            }

            return response
        } finally {
            connection.disconnect()
        }
    }

    private fun multipartRequest(
        path: String,
        method: String,
        accessToken: String,
        fields: Map<String, String>,
        file: FacePhotoUpload?
    ): String {
        val boundary = "SkinData-${UUID.randomUUID()}"
        val endpoint = URL("${baseUrl.trimEnd('/')}${path}")
        val connection = endpoint.openConnection() as HttpURLConnection

        try {
            connection.requestMethod = method
            connection.connectTimeout = 10_000
            connection.readTimeout = 20_000
            connection.doOutput = true
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")

            val body = ByteArrayOutputStream()
            fun write(value: String) {
                body.write(value.toByteArray(Charsets.UTF_8))
            }

            fields.forEach { (name, value) ->
                write("--$boundary\r\n")
                write("Content-Disposition: form-data; name=\"$name\"\r\n\r\n")
                write(value)
                write("\r\n")
            }

            if (file != null) {
                write("--$boundary\r\n")
                write("Content-Disposition: form-data; name=\"facePhoto\"; filename=\"${file.fileName}\"\r\n")
                write("Content-Type: ${file.contentType}\r\n\r\n")
                body.write(file.bytes)
                write("\r\n")
            }

            write("--$boundary--\r\n")

            connection.outputStream.use { outputStream ->
                outputStream.write(body.toByteArray())
            }

            val responseCode = connection.responseCode
            val response = if (responseCode in 200..299) {
                connection.inputStream.bufferedReader().use { it.readText() }
            } else {
                connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
            }

            if (responseCode !in 200..299) {
                throw IllegalStateException("Backend request failed: $responseCode $response")
            }

            return response
        } finally {
            connection.disconnect()
        }
    }
}

@Serializable
data class ApiResponse<T>(
    val data: T
)

@Serializable
data class ProfileDto(
    val id: String,
    val userId: String,
    val displayName: String? = null,
    val skinTypeCode: String? = null,
    val skinTypeCompletedAt: String? = null
)

@Serializable
data class SkinTypeQuestionsDto(
    val version: String,
    val title: String,
    val description: String? = null,
    val sections: List<SkinTypeSectionDto>
)

@Serializable
data class SkinTypeSectionDto(
    val dimension: String,
    val title: String,
    val questions: List<SkinTypeQuestionDto>
)

@Serializable
data class SkinTypeQuestionDto(
    val id: String,
    val text: String,
    val options: List<SkinTypeOptionDto>
)

@Serializable
data class SkinTypeOptionDto(
    val id: String,
    val text: String
)

@Serializable
data class SkinTypeResponseInput(
    val questionId: String,
    val optionId: String
)

@Serializable
data class SubmitSkinTypeResponsesRequest(
    val questionnaireVersion: String,
    val responses: List<SkinTypeResponseInput>
)

@Serializable
data class SkinTypeResultDto(
    val skinTypeCode: String,
    val displayName: String,
    val dimensions: SkinTypeDimensionsDto,
    val notice: String,
    val completedAt: String
)

@Serializable
data class SkinTypeDimensionsDto(
    val oilDry: SkinTypeDimensionResultDto,
    val sensitiveResistant: SkinTypeDimensionResultDto,
    val pigmentedNonPigmented: SkinTypeDimensionResultDto,
    val wrinkledTight: SkinTypeDimensionResultDto
)

@Serializable
data class SkinTypeDimensionResultDto(
    val code: String,
    val label: String,
    val score: Double
)

@Serializable
data class ProductSearchDto(
    val items: List<ProductDto>,
    val canSubmitProduct: Boolean
)

@Serializable
data class ProductDto(
    val id: String,
    val source: String,
    val verificationStatus: String,
    val name: String,
    val brand: String,
    val category: String? = null,
    val ingredientsText: String? = null,
    val ingredients: List<ProductIngredientDto> = emptyList()
)

@Serializable
data class ProductIngredientDto(
    val name: String,
    val normalizedName: String,
    val matchedIngredientId: String? = null,
    val matchStatus: String
)

@Serializable
data class UserProductsDto(
    val items: List<UserProductDto>
)

@Serializable
data class UserProductDto(
    val id: String,
    val productId: String,
    val usageStatus: String,
    val startedAt: String? = null,
    val isPastExperience: Boolean,
    val pastReactionMemo: String? = null,
    val memo: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val product: ProductDto
)

@Serializable
data class SaveUserProductRequest(
    val productId: String,
    val usageStatus: String,
    val isPastExperience: Boolean,
    val pastReactionMemo: String? = null,
    val memo: String? = null
)

@Serializable
data class ProductPresetsDto(
    val items: List<ProductPresetDto>
)

@Serializable
data class ProductPresetDto(
    val id: String,
    val name: String,
    val products: List<UserProductDto>,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class SaveProductPresetRequest(
    val name: String,
    val userProductIds: List<String>
)

@Serializable
data class DailyRecordsDto(
    val items: List<DailyRecordDto>
)

@Serializable
data class DailyRecordDto(
    val id: String,
    val recordDate: String,
    val loggedAt: String,
    val dryness: Int,
    val oiliness: Int,
    val redness: Int,
    val trouble: Int,
    val sleepHours: Double,
    val memo: String? = null,
    val products: List<UserProductDto>,
    val appliedPresets: List<AppliedPresetDto>,
    val facePhoto: SkinPhotoDto? = null,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class AppliedPresetDto(
    val id: String,
    val name: String
)

@Serializable
data class SkinPhotoDto(
    val id: String,
    val storagePath: String,
    val contentType: String,
    val fileSize: Int
)

@Serializable
data class SaveDailyRecordRequest(
    val recordDate: String,
    val dryness: Int,
    val oiliness: Int,
    val redness: Int,
    val trouble: Int,
    val sleepHours: Double,
    val userProductIds: List<String>,
    val appliedPresetIds: List<String>,
    val memo: String? = null
)

data class FacePhotoUpload(
    val fileName: String,
    val contentType: String,
    val bytes: ByteArray
)
