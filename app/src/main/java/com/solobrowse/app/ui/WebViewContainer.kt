package com.solobrowse.app.ui

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.solobrowse.app.model.BrowserTab

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebViewContainer(tab: BrowserTab, modifier: Modifier = Modifier) {
    AndroidView(
        modifier = modifier,
        factory = { context ->
            val webView = tab.webView ?: WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )

                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true
                settings.builtInZoomControls = true
                settings.displayZoomControls = false
                settings.setSupportZoom(true)
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

                webViewClient = object : WebViewClient() {
                    override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                        tab.isLoading = true
                        tab.url = url
                        tab.canGoBack = view.canGoBack()
                        tab.canGoForward = view.canGoForward()
                    }

                    override fun onPageFinished(view: WebView, url: String) {
                        tab.isLoading = false
                        tab.url = url
                        tab.title = view.title?.takeIf { it.isNotBlank() } ?: url
                        tab.canGoBack = view.canGoBack()
                        tab.canGoForward = view.canGoForward()
                    }
                }

                webChromeClient = object : WebChromeClient() {
                    override fun onProgressChanged(view: WebView, newProgress: Int) {
                        tab.progress = newProgress
                    }

                    override fun onReceivedTitle(view: WebView, title: String?) {
                        if (!title.isNullOrBlank()) tab.title = title
                    }
                }

                loadUrl(tab.url)
                tab.webView = this
            }

            // Reused WebViews may still be attached to a previous parent (e.g. after a
            // tab switch); detach before attaching to this composable's container.
            (webView.parent as? ViewGroup)?.removeView(webView)
            webView
        },
        update = { }
    )
}
