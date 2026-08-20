package com.solobrowse.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solobrowse.app.viewmodel.BrowserViewModel
import java.net.URLEncoder

private const val HOME_URL = "https://www.google.com"

private fun normalizeInput(input: String): String {
    val trimmed = input.trim()
    if (trimmed.isEmpty()) return HOME_URL

    val looksLikeUrl = trimmed.contains(".") && !trimmed.contains(" ")
    return when {
        trimmed.startsWith("http://") || trimmed.startsWith("https://") -> trimmed
        looksLikeUrl -> "https://$trimmed"
        else -> "https://www.google.com/search?q=" + URLEncoder.encode(trimmed, "UTF-8")
    }
}

@Composable
fun BrowserScreen(viewModel: BrowserViewModel = viewModel()) {
    val tabs = viewModel.tabs
    val activeTab = viewModel.activeTab

    Box(modifier = Modifier.fillMaxSize().background(Color.White)) {
        when {
            viewModel.showTabSwitcher -> {
                TabSwitcherScreen(
                    tabs = tabs,
                    activeTabId = viewModel.activeTabId,
                    onSelect = { viewModel.selectTab(it) },
                    onClose = { viewModel.closeTab(it) },
                    onNewTab = { viewModel.newTab() },
                    onDone = { viewModel.showTabSwitcher = false }
                )
            }

            viewModel.showBookmarks -> {
                BookmarksScreen(
                    bookmarks = viewModel.bookmarks,
                    onOpen = { url ->
                        viewModel.showBookmarks = false
                        activeTab?.webView?.loadUrl(url)
                    },
                    onRemove = { viewModel.removeBookmark(it) },
                    onClose = { viewModel.showBookmarks = false }
                )
            }

            else -> {
                Column(modifier = Modifier.fillMaxSize()) {
                    AddressBar(
                        displayUrl = activeTab?.url ?: "",
                        isLoading = activeTab?.isLoading ?: false,
                        isBookmarked = activeTab?.let { viewModel.isBookmarked(it.url) } ?: false,
                        tabCount = tabs.size,
                        onSubmit = { input -> activeTab?.webView?.loadUrl(normalizeInput(input)) },
                        onHome = { activeTab?.webView?.loadUrl(HOME_URL) },
                        onReloadOrStop = {
                            if (activeTab?.isLoading == true) {
                                activeTab.webView?.stopLoading()
                            } else {
                                activeTab?.webView?.reload()
                            }
                        },
                        onNewTab = { viewModel.newTab() },
                        onOpenTabs = { viewModel.showTabSwitcher = true },
                        onToggleBookmark = {
                            activeTab?.let { viewModel.toggleBookmark(it.title, it.url) }
                        },
                        onOpenMenu = { viewModel.showBookmarks = true }
                    )

                    if (activeTab?.isLoading == true) {
                        LinearProgressIndicator(
                            progress = (activeTab.progress / 100f).coerceIn(0f, 1f),
                            modifier = Modifier.fillMaxWidth(),
                            color = Color.Black,
                            trackColor = Color(0xFFEFEFEF)
                        )
                    }

                    Box(modifier = Modifier.weight(1f)) {
                        activeTab?.let { tab ->
                            key(tab.id) {
                                WebViewContainer(tab = tab, modifier = Modifier.fillMaxSize())
                            }
                        }
                    }
                }
            }
        }
    }
}
