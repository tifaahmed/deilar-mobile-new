package com.deilar.card;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Forced (mandatory) update: whenever Google Play has a newer version, the
 * IMMEDIATE flow blocks the app with a full-screen update until it is installed.
 */
public class MainActivity extends BridgeActivity {
    private static final int UPDATE_REQUEST = 4021;
    private AppUpdateManager updateManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        updateManager = AppUpdateManagerFactory.create(this);
        padForSystemBars();
    }

    /**
     * Android 15+ draws the app edge-to-edge, which puts the header under the
     * status bar / camera cutout. Keep the WebView inside the safe area.
     */
    private void padForSystemBars() {
        View webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets nav = windowInsets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.navigationBars());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, nav.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(webView);
        guardAgainstOverlap(webView);
    }

    /**
     * Some phones (OEM skins, 3-button navigation, gesture pill) report the
     * navigation bar late or not at all, so the bottom tab bar ends up behind
     * the system keys. Measure where the WebView really ends on screen and, if
     * it overlaps the navigation bar, push its bottom padding up by the overlap.
     */
    private void guardAgainstOverlap(View webView) {
        View decor = getWindow().getDecorView();
        decor.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
            WindowInsetsCompat root = ViewCompat.getRootWindowInsets(decor);
            if (root == null || decor.getHeight() == 0) return;
            // Ignoring visibility also covers bars the OEM reports as hidden but still draws.
            int navInset = Math.max(
                    root.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom,
                    root.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.navigationBars()).bottom);
            int[] loc = new int[2];
            webView.getLocationInWindow(loc);
            int contentBottom = loc[1] + webView.getHeight() - webView.getPaddingBottom();
            int overlap = contentBottom - (decor.getHeight() - navInset);
            if (overlap > 0) {
                webView.setPadding(webView.getPaddingLeft(), webView.getPaddingTop(),
                        webView.getPaddingRight(), webView.getPaddingBottom() + overlap);
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        checkForcedUpdate();
    }

    private void checkForcedUpdate() {
        updateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            boolean newVersion = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE;
            // Also resumes an update the user started and then left.
            boolean inProgress = info.updateAvailability()
                    == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
            if ((newVersion || inProgress) && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                startUpdate(info);
            }
        });
    }

    private void startUpdate(AppUpdateInfo info) {
        try {
            updateManager.startUpdateFlowForResult(
                    info, this, AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(), UPDATE_REQUEST);
        } catch (Exception ignored) {
            // Play unavailable (sideload/emulator) — don't block the app.
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        // User cancelled/failed the mandatory update: check again on next resume,
        // and close the app so it can't be used un-updated.
        if (requestCode == UPDATE_REQUEST && resultCode != RESULT_OK) {
            finishAffinity();
        }
    }
}
