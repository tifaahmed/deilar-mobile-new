package com.deilar.card;

import android.content.Intent;
import android.os.Bundle;

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
