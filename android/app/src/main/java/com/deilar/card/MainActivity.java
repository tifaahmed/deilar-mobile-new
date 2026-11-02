package com.deilar.card;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;

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
        registerPlugin(GallerySaverPlugin.class);
        super.onCreate(savedInstanceState);
        updateManager = AppUpdateManagerFactory.create(this);
        padForSystemBars();
    }

    /**
     * Android 15+ draws the app edge-to-edge, which puts the header under the status bar / camera cutout. Keep the
     * WebView inside the safe area.
     *
     * Older Androids (an Oppo A31 on Android 9/10) already leave the status bar and the navigation keys OUT of the
     * content frame yet still report the same insets, so adding the whole inset as a margin counted the bars twice
     * and left a blank band above and below the page. The margin is therefore only what the content frame has NOT
     * already left free around the WebView.
     */
    private void padForSystemBars() {
        View webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            fitToSafeArea(windowInsets);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(webView);

        // Layout is not done when the first insets arrive, and some phones (OEM skins, 3-button navigation, gesture
        // pill) report the navigation bar late: measure again after every layout, from the window's own insets.
        View decor = getWindow().getDecorView();
        decor.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
            WindowInsetsCompat root = ViewCompat.getRootWindowInsets(decor);
            if (root != null) fitToSafeArea(root);
        });
    }

    private void fitToSafeArea(WindowInsetsCompat windowInsets) {
        View webView = getBridge().getWebView();
        View parent = (View) webView.getParent();
        View decor = getWindow().getDecorView();
        if (parent == null || parent.getHeight() == 0 || parent.getWidth() == 0 || decor.getHeight() == 0) return;

        Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        // Ignoring visibility also covers bars the OEM reports as hidden but still draws.
        Insets nav = windowInsets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.navigationBars());

        int[] d = new int[2];
        int[] p = new int[2];
        decor.getLocationOnScreen(d);
        parent.getLocationOnScreen(p);
        int freeLeft = Math.max(0, p[0] - d[0]);
        int freeTop = Math.max(0, p[1] - d[1]);
        int freeRight = Math.max(0, (d[0] + decor.getWidth()) - (p[0] + parent.getWidth()));
        int freeBottom = Math.max(0, (d[1] + decor.getHeight()) - (p[1] + parent.getHeight()));

        setMargins(webView,
                Math.max(0, bars.left - freeLeft),
                Math.max(0, bars.top - freeTop),
                Math.max(0, bars.right - freeRight),
                Math.max(0, Math.max(bars.bottom, nav.bottom) - freeBottom));
    }

    /**
     * Margins, not padding: a WebView ignores its own padding when drawing the page, so the page would still
     * run under the status bar and the navigation keys.
     */
    private static void setMargins(View v, int left, int top, int right, int bottom) {
        ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) v.getLayoutParams();
        if (lp.leftMargin == left && lp.topMargin == top && lp.rightMargin == right && lp.bottomMargin == bottom) return;
        lp.setMargins(left, top, right, bottom);
        v.setLayoutParams(lp);
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
