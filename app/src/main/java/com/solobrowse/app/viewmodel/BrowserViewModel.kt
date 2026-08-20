package com.solobrowse.app.viewmodel

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import com.solobrowse.app.model.Bookmark
import com.solobrowse.app.model.BrowserTab
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicLong

class BrowserViewModel(application: Application) : AndroidViewModel(application) {

    private val idGenerator = AtomicLong(0)
    private val prefs = application.getSharedPreferences("solobrowse_prefs", 0)

    val tabs = mutableStateListOf<BrowserTab>()
    var activeTabId by mutableStateOf(-1L)
        private set

    var showTabSwitcher by mutableStateOf(false)
    var showBookmarks by mutableStateOf(false)

    val bookmarks = mutableStateListOf<Bookmark>()

    val activeTab: BrowserTab?
        get() = tabs.find { it.id == activeTabId }

    init {
        loadBookmarks()
        newTab()
    }

    fun newTab(url: String = "https://www.google.com") {
        val tab = BrowserTab(idGenerator.incrementAndGet(), url)
        tabs.add(tab)
        activeTabId = tab.id
        showTabSwitcher = false
    }

    fun selectTab(id: Long) {
        activeTabId = id
        showTabSwitcher = false
    }

    fun closeTab(id: Long) {
        val index = tabs.indexOfFirst { it.id == id }
        if (index == -1) return

        tabs[index].webView?.destroy()
        tabs.removeAt(index)

        if (tabs.isEmpty()) {
            newTab()
        } else if (activeTabId == id) {
            val newIndex = index.coerceAtMost(tabs.size - 1)
            activeTabId = tabs[newIndex].id
        }
    }

    fun isBookmarked(url: String): Boolean = bookmarks.any { it.url == url }

    fun toggleBookmark(title: String, url: String) {
        val existingIndex = bookmarks.indexOfFirst { it.url == url }
        if (existingIndex >= 0) {
            bookmarks.removeAt(existingIndex)
        } else {
            bookmarks.add(0, Bookmark(title.ifBlank { url }, url))
        }
        saveBookmarks()
    }

    fun removeBookmark(url: String) {
        bookmarks.removeAll { it.url == url }
        saveBookmarks()
    }

    private fun loadBookmarks() {
        val json = prefs.getString("bookmarks", null) ?: return
        val arr = JSONArray(json)
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            bookmarks.add(Bookmark(obj.getString("title"), obj.getString("url")))
        }
    }

    private fun saveBookmarks() {
        val arr = JSONArray()
        bookmarks.forEach { bookmark ->
            val obj = JSONObject()
            obj.put("title", bookmark.title)
            obj.put("url", bookmark.url)
            arr.put(obj)
        }
        prefs.edit().putString("bookmarks", arr.toString()).apply()
    }
}
