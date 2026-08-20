package com.solobrowse.app.model

import android.webkit.WebView
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Holds the state for a single browser tab. The underlying WebView instance is kept
 * alive for the lifetime of the tab so switching tabs doesn't reload pages.
 */
class BrowserTab(val id: Long, initialUrl: String = "https://www.google.com") {
    var webView: WebView? = null

    var title by mutableStateOf("New Tab")
    var url by mutableStateOf(initialUrl)
    var canGoBack by mutableStateOf(false)
    var canGoForward by mutableStateOf(false)
    var isLoading by mutableStateOf(false)
    var progress by mutableStateOf(0)
}
