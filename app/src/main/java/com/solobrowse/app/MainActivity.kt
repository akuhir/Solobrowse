package com.solobrowse.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.lifecycle.ViewModelProvider
import com.solobrowse.app.ui.BrowserScreen
import com.solobrowse.app.ui.theme.SolobrowseTheme
import com.solobrowse.app.viewmodel.BrowserViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val viewModel = ViewModelProvider(this)[BrowserViewModel::class.java]

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val tab = viewModel.activeTab
                when {
                    viewModel.showTabSwitcher -> viewModel.showTabSwitcher = false
                    viewModel.showBookmarks -> viewModel.showBookmarks = false
                    tab?.webView?.canGoBack() == true -> tab.webView?.goBack()
                    else -> finish()
                }
            }
        })

        setContent {
            SolobrowseTheme {
                BrowserScreen(viewModel = viewModel)
            }
        }
    }
}
