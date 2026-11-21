package com.deilar.card;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.media.MediaScannerConnection;
import android.util.Base64;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Saves a PNG into the phone's gallery (Pictures/Deilar). A WebView cannot save a blob through
 * {@code <a download>} — it only raises a notification — so the app hands the image bytes here.
 */
@CapacitorPlugin(name = "GallerySaver")
public class GallerySaverPlugin extends Plugin {
    private static final String CHANNEL_ID = "downloads";

    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        String name = call.getString("filename", "deilar-card.png");
        if (data == null || data.isEmpty()) {
            call.reject("No image data");
            return;
        }
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            String path;
            Uri openUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Deilar");
                Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IllegalStateException("Could not create the file");
                try (OutputStream out = resolver.openOutputStream(uri)) {
                    out.write(bytes);
                }
                path = uri.toString();
                openUri = uri;
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Deilar");
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Could not create the folder");
                File file = new File(dir, name);
                try (FileOutputStream out = new FileOutputStream(file)) {
                    out.write(bytes);
                }
                MediaScannerConnection.scanFile(getContext(), new String[]{file.getAbsolutePath()}, new String[]{"image/png"}, null);
                path = file.getAbsolutePath();
                openUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            }
            notifyDownloaded(openUri, name, call.getString("title"), call.getString("text"));
            JSObject result = new JSObject();
            result.put("path", path);
            call.resolve(result);
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "Could not save the image", e);
        }
    }

    /**
     * Tells the member the file was saved; tapping the notification opens it in the phone's viewer/gallery.
     * Android 13+ needs the notifications permission: it is asked once here (the file is saved either way).
     */
    private void notifyDownloaded(Uri uri, String name, String title, String text) {
        try {
            Context ctx = getContext();
            if (Build.VERSION.SDK_INT >= 33
                    && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                if (getActivity() != null) {
                    ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4022);
                }
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Downloads", NotificationManager.IMPORTANCE_DEFAULT);
                ctx.getSystemService(NotificationManager.class).createNotificationChannel(channel);
            }
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(uri, "image/png");
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            int id = (int) (System.currentTimeMillis() % Integer.MAX_VALUE);
            PendingIntent pending = PendingIntent.getActivity(ctx, id, view, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.stat_sys_download_done)
                    .setContentTitle(title != null ? title : "اتحمّل الملف")
                    .setContentText(text != null ? text : name + " — دوس عشان تفتحه")
                    .setContentIntent(pending)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT);
            NotificationManagerCompat.from(ctx).notify(id, builder.build());
        } catch (Exception ignored) {
            // The file is already saved; a missing notification must not fail the download.
        }
    }
}
