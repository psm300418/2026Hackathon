package com.hackathon.skindata

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.hackathon.skindata.feature.auth.AuthRoute
import com.hackathon.skindata.ui.theme.SkinDataTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SkinDataTheme {
                AuthRoute()
            }
        }
    }
}
