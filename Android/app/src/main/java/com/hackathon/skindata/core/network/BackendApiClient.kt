package com.hackathon.skindata.core.network

import com.hackathon.skindata.BuildConfig
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

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
