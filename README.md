# Solobrowse

A native Android browser built with Kotlin + Jetpack Compose, using Android's
WebView engine under the hood. Black-and-white UI styled after Chrome.

## Features in this build
- Multi-tab browsing with a Chrome-style grid tab switcher (card per tab, tap to
  switch, X to close, + to open a new tab)
- Address bar that doubles as a search bar — type a URL or a search term, it
  detects which one you mean
- Back / forward / reload (turns into a stop button while a page is loading) / home
- Bookmarks: star icon toggles bookmarking the current page; the bookmarks list
  is reachable from the ⋮ menu and persists across app restarts (stored on-device
  via SharedPreferences)
- Loading progress bar under the address bar
- System back button closes the tab switcher/bookmarks first, then navigates
  page history, then exits the app — matches normal Android/Chrome behavior
- Each tab keeps its own WebView alive in the background, so switching tabs
  doesn't reload the page

## Not included (out of scope for this build)
Real Chrome is a massive, multi-thousand-engineer project (its own rendering
engine, extensions, account sync, incognito, autofill, translate, etc.). This
build focuses on the core browsing experience you'd reach for daily. Things
like history, downloads manager, find-in-page, and desktop-site toggle weren't
part of this round's scope but can be added — the codebase is small and
structured so any of those slot in cleanly.

## How to open and run it
1. Install [Android Studio](https://developer.android.com/studio) (Hedgehog or
   newer recommended).
2. Unzip this project, then in Android Studio choose **File → Open** and select
   the `Solobrowse` folder.
3. Let Gradle sync (it will download dependencies the first time — needs
   internet).
4. Press **Run ▶** with an emulator or a physical device connected (USB
   debugging enabled).

Minimum Android version supported: Android 7.0 (API 24).

## Project structure
```
app/src/main/java/com/solobrowse/app/
  MainActivity.kt              — entry point, back-press handling
  model/
    BrowserTab.kt               — per-tab state + WebView reference
    Bookmark.kt
  viewmodel/
    BrowserViewModel.kt         — tabs, active tab, bookmarks (persisted)
  ui/
    BrowserScreen.kt            — main screen: address bar, webview, nav bar
    AddressBar.kt
    WebViewContainer.kt         — wraps and reuses the Android WebView per tab
    TabSwitcherScreen.kt        — grid tab switcher
    BookmarksScreen.kt
    theme/Theme.kt              — black & white Material3 theme
```

## Extending it
- **History**: add a `History` list similar to `bookmarks` in `BrowserViewModel`,
  and log the URL in `onPageFinished` in `WebViewContainer.kt`.
- **Downloads**: set a `DownloadListener` on the WebView and hand off to
  `DownloadManager`.
- **Find-in-page**: `WebView.findAllAsync(query)` / `findNext(true)`.
- **Desktop mode**: toggle `settings.userAgentString` between the default and a
  desktop Chrome UA string, then `reload()`.
