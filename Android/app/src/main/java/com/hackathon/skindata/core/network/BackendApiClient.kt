package com.hackathon.skindata.core.network

import com.hackathon.skindata.BuildConfig
import io.github.jan.supabase.auth.auth
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
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
    private companion object {
        const val CONNECT_TIMEOUT_MS = 30_000
        const val READ_TIMEOUT_MS = 45_000
        const val MULTIPART_READ_TIMEOUT_MS = 60_000
    }

    private data class BackendResponse(
        val responseCode: Int,
        val body: String
    )

    suspend fun getMyProfile(accessToken: String): ProfileDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/profile/me",
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<ProfileDto>>(body).data
    }

    suspend fun signup(email: String, password: String): BackendSignupDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/auth/signup",
            method = "POST",
            accessToken = null,
            requestBody = json.encodeToString(BackendSignupRequest(email = email, password = password))
        )

        json.decodeFromString<ApiResponse<BackendSignupDto>>(body).data
    }

    suspend fun getLocationOptions(): LocationOptionsDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/profile/location-options",
            method = "GET",
            accessToken = null
        )

        json.decodeFromString<ApiResponse<LocationOptionsDto>>(body).data
    }

    suspend fun getMyLocation(accessToken: String): UserLocationDto? = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/profile/location",
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<UserLocationDto?>>(body).data
    }

    suspend fun saveMyLocation(
        accessToken: String,
        locationId: String
    ): UserLocationDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/profile/location",
            method = "PUT",
            accessToken = accessToken,
            requestBody = json.encodeToString(SaveLocationRequest(locationId = locationId))
        )

        json.decodeFromString<ApiResponse<UserLocationDto>>(body).data
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
        responses: List<SkinTypeResponseInput>,
        knownDimensions: KnownSkinTypeDimensionsInput
    ): SkinTypeResultDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/onboarding/skin-type/responses",
            method = "POST",
            accessToken = accessToken,
            requestBody = json.encodeToString(
                SubmitSkinTypeResponsesRequest(
                    questionnaireVersion = questionnaireVersion,
                    responses = responses,
                    knownDimensions = knownDimensions
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

    suspend fun extractProductSubmission(
        accessToken: String,
        itemType: String,
        labelPhoto: FacePhotoUpload
    ): ProductSubmissionExtractionDto = withContext(Dispatchers.IO) {
        val body = multipartRequest(
            path = "/api/product-submissions/extract",
            method = "POST",
            accessToken = accessToken,
            fields = mapOf("itemType" to itemType),
            file = labelPhoto,
            fileFieldName = "ingredientLabelImage"
        )

        json.decodeFromString<ApiResponse<ProductSubmissionExtractionDto>>(body).data
    }

    suspend fun confirmProductSubmission(
        accessToken: String,
        request: ConfirmProductSubmissionRequest
    ): ConfirmProductSubmissionDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/product-submissions",
            method = "POST",
            accessToken = accessToken,
            requestBody = json.encodeToString(request)
        )

        json.decodeFromString<ApiResponse<ConfirmProductSubmissionDto>>(body).data
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

    suspend fun getDailyRecords(
        accessToken: String,
        from: String? = null,
        to: String? = null
    ): DailyRecordsDto = withContext(Dispatchers.IO) {
        val query = listOfNotNull(
            from?.let { "from=$it" },
            to?.let { "to=$it" }
        ).joinToString("&")
        val path = if (query.isBlank()) "/api/daily-records" else "/api/daily-records?$query"
        val body = request(
            path = path,
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<DailyRecordsDto>>(body).data
    }

    suspend fun getDailyRecordTrends(
        accessToken: String,
        from: String,
        to: String
    ): DailyRecordTrendsDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/daily-records/trends?from=$from&to=$to",
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<DailyRecordTrendsDto>>(body).data
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
            "outdoorMinutes" to request.outdoorMinutes.toString(),
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

    suspend fun getLatestAnalysis(accessToken: String): AnalysisResultDto? = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/analysis/latest",
            method = "GET",
            accessToken = accessToken
        )

        json.decodeFromString<ApiResponse<AnalysisResultDto?>>(body).data
    }

    suspend fun runAnalysis(accessToken: String): AnalysisResultDto = withContext(Dispatchers.IO) {
        val body = request(
            path = "/api/analysis/run",
            method = "POST",
            accessToken = accessToken,
            requestBody = "{}"
        )

        json.decodeFromString<ApiResponse<AnalysisResultDto>>(body).data
    }

    private suspend fun request(
        path: String,
        method: String,
        accessToken: String?,
        requestBody: String? = null
    ): String {
        try {
            val initialResponse = executeRequest(
                path = path,
                method = method,
                accessToken = accessToken,
                requestBody = requestBody
            )

            if (initialResponse.responseCode == HttpURLConnection.HTTP_UNAUTHORIZED && accessToken != null) {
                val refreshedToken = refreshAccessToken()
                val retryResponse = executeRequest(
                    path = path,
                    method = method,
                    accessToken = refreshedToken,
                    requestBody = requestBody
                )
                return retryResponse.bodyOrThrow()
            }

            return initialResponse.bodyOrThrow()
        } catch (error: SocketTimeoutException) {
            throw IllegalStateException("서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.", error)
        } catch (error: IOException) {
            throw IllegalStateException("네트워크 연결이 불안정합니다. 연결 상태를 확인한 뒤 다시 시도해주세요.", error)
        }
    }

    private fun executeRequest(
        path: String,
        method: String,
        accessToken: String?,
        requestBody: String? = null
    ): BackendResponse {
        val endpoint = URL("${baseUrl.trimEnd('/')}${path}")
        val connection = endpoint.openConnection() as HttpURLConnection

        try {
            connection.requestMethod = method
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = READ_TIMEOUT_MS
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

            return BackendResponse(responseCode = responseCode, body = response)
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun multipartRequest(
        path: String,
        method: String,
        accessToken: String,
        fields: Map<String, String>,
        file: FacePhotoUpload?,
        fileFieldName: String = "facePhoto"
    ): String {
        try {
            val initialResponse = executeMultipartRequest(
                path = path,
                method = method,
                accessToken = accessToken,
                fields = fields,
                file = file,
                fileFieldName = fileFieldName
            )

            if (initialResponse.responseCode == HttpURLConnection.HTTP_UNAUTHORIZED) {
                val refreshedToken = refreshAccessToken()
                val retryResponse = executeMultipartRequest(
                    path = path,
                    method = method,
                    accessToken = refreshedToken,
                    fields = fields,
                    file = file,
                    fileFieldName = fileFieldName
                )
                return retryResponse.bodyOrThrow()
            }

            return initialResponse.bodyOrThrow()
        } catch (error: SocketTimeoutException) {
            throw IllegalStateException("서버 응답 시간이 초과되었습니다. 사진 크기를 줄이거나 잠시 후 다시 시도해주세요.", error)
        } catch (error: IOException) {
            throw IllegalStateException("네트워크 연결이 불안정합니다. 연결 상태를 확인한 뒤 다시 시도해주세요.", error)
        }
    }

    private fun executeMultipartRequest(
        path: String,
        method: String,
        accessToken: String,
        fields: Map<String, String>,
        file: FacePhotoUpload?,
        fileFieldName: String = "facePhoto"
    ): BackendResponse {
        val boundary = "SkinData-${UUID.randomUUID()}"
        val endpoint = URL("${baseUrl.trimEnd('/')}${path}")
        val connection = endpoint.openConnection() as HttpURLConnection

        try {
            connection.requestMethod = method
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = MULTIPART_READ_TIMEOUT_MS
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
                write("Content-Disposition: form-data; name=\"$fileFieldName\"; filename=\"${file.fileName}\"\r\n")
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

            return BackendResponse(responseCode = responseCode, body = response)
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun refreshAccessToken(): String {
        return runCatching {
            SupabaseProvider.client.auth.refreshCurrentSession()
            SupabaseProvider.client.auth.currentAccessTokenOrNull()
        }.getOrNull()
            ?: throw IllegalStateException("로그인 세션이 만료되었습니다. 다시 로그인해주세요.")
    }

    private fun BackendResponse.bodyOrThrow(): String {
        if (responseCode !in 200..299) {
            throw IllegalStateException("Backend request failed: $responseCode $body")
        }

        return body
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
data class BackendSignupRequest(
    val email: String,
    val password: String
)

@Serializable
data class BackendSignupDto(
    val created: Boolean,
    val userId: String? = null,
    val message: String
)

@Serializable
data class LocationOptionsDto(
    val items: List<LocationOptionDto>
)

@Serializable
data class LocationOptionDto(
    val id: String,
    val regionLabel: String,
    val weatherStationId: Int,
    val weatherStationName: String
)

@Serializable
data class UserLocationDto(
    val id: String,
    val regionLabel: String,
    val weatherStationId: Int,
    val weatherStationName: String,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class SaveLocationRequest(
    val locationId: String
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
    val responses: List<SkinTypeResponseInput>,
    val knownDimensions: KnownSkinTypeDimensionsInput
)

@Serializable
data class KnownSkinTypeDimensionsInput(
    val oilDry: String? = null,
    val sensitiveResistant: String? = null,
    val pigmentedNonPigmented: String? = null,
    val wrinkledTight: String? = null
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
    val itemType: String = "cosmetic",
    val name: String,
    val brand: String,
    val category: String? = null,
    val ingredientsText: String? = null,
    val ingredients: List<ProductIngredientDto> = emptyList()
)

@Serializable
data class ProductSubmissionExtractionDto(
    val extractedText: String,
    val ingredients: List<ProductSubmissionIngredientDto>,
    val warnings: List<String> = emptyList()
)

@Serializable
data class ProductSubmissionIngredientDto(
    val rawName: String,
    val normalizedName: String,
    val matchedIngredientId: String? = null,
    val matchStatus: String
)

@Serializable
data class ConfirmProductSubmissionRequest(
    val itemType: String,
    val name: String,
    val brand: String,
    val category: String? = null,
    val aiExtractedText: String? = null,
    val confirmedIngredientsText: String
)

@Serializable
data class ConfirmProductSubmissionDto(
    val submissionId: String,
    val productId: String,
    val userProduct: UserProductDto
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
    val outdoorMinutes: Int? = null,
    val memo: String? = null,
    val products: List<UserProductDto>,
    val appliedPresets: List<AppliedPresetDto>,
    val environment: DailyRecordEnvironmentDto? = null,
    val facePhoto: SkinPhotoDto? = null,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class DailyRecordTrendsDto(
    val from: String,
    val to: String,
    val points: List<DailyRecordTrendPointDto>
)

@Serializable
data class DailyRecordTrendPointDto(
    val date: String,
    val scores: DailyRecordTrendScoresDto,
    val sleepHours: Double? = null,
    val outdoorMinutes: Int? = null,
    val productSummary: DailyRecordTrendProductSummaryDto,
    val environment: DailyRecordEnvironmentDto? = null
)

@Serializable
data class DailyRecordTrendScoresDto(
    val dryness: Int? = null,
    val oiliness: Int? = null,
    val redness: Int? = null,
    val trouble: Int? = null
)

@Serializable
data class DailyRecordTrendProductSummaryDto(
    val count: Int,
    val names: List<String>,
    val remainingCount: Int
)

@Serializable
data class DailyRecordEnvironmentDto(
    val id: String,
    val source: String,
    val regionLabel: String? = null,
    val weatherStationId: Int? = null,
    val weatherStationName: String? = null,
    val observedAt: String? = null,
    val temperatureCelsius: Double? = null,
    val humidityPercent: Double? = null,
    val precipitationAmountMm: Double? = null,
    val windSpeedMps: Double? = null
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
    val outdoorMinutes: Int,
    val userProductIds: List<String>,
    val appliedPresetIds: List<String>,
    val memo: String? = null
)

data class FacePhotoUpload(
    val fileName: String,
    val contentType: String,
    val bytes: ByteArray
)

@Serializable
data class AnalysisResultDto(
    val analysisRunId: String,
    val requestedAt: String,
    val confidenceLevel: String,
    val summary: String,
    val trendPoints: List<AnalysisTrendPointDto> = emptyList(),
    val notableEvents: List<AnalysisNotableEventDto> = emptyList(),
    val factorSummaries: List<AnalysisFactorSummaryDto> = emptyList(),
    val positiveSuspectedIngredients: List<AnalysisFindingDto>,
    val negativeSuspectedIngredients: List<AnalysisFindingDto>,
    val limitations: List<String>,
    val nextRecordsToAdd: List<String>
)

@Serializable
data class AnalysisTrendPointDto(
    val date: String,
    val totalScore: Double,
    val dryness: Double,
    val oiliness: Double,
    val redness: Double,
    val trouble: Double,
    val sleepHours: Double,
    val outdoorMinutes: Int? = null,
    val humidityPercent: Double? = null,
    val temperatureCelsius: Double? = null
)

@Serializable
data class AnalysisNotableEventDto(
    val date: String,
    val title: String,
    val severity: String,
    val totalScore: Double,
    val baselineScore: Double,
    val scoreDelta: Double,
    val factorTags: List<String> = emptyList(),
    val reasons: List<String> = emptyList(),
    val productNames: List<String> = emptyList()
)

@Serializable
data class AnalysisFactorSummaryDto(
    val factorTag: String,
    val label: String,
    val hitCount: Int,
    val eventCount: Int,
    val description: String
)

@Serializable
data class AnalysisFindingDto(
    val id: String,
    val name: String,
    val evidenceLevel: String,
    val reason: String,
    val supportingLogs: List<String> = emptyList()
)
