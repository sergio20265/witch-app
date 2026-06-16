package online.forestloom.grimoire;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleShareIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Приложение уже запущено — мост готов, диспатчим немедленно
        dispatchShareIntent(intent);
    }

    /** Сохраняет данные шаринга в preferences; диспатч происходит из load(). */
    private void handleShareIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();
        if (!Intent.ACTION_SEND.equals(action) || type == null) return;

        String json = null;

        if (type.startsWith("image/")) {
            Uri imageUri = getImageUri(intent);
            if (imageUri != null) {
                try {
                    InputStream is = getContentResolver().openInputStream(imageUri);
                    if (is != null) {
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = is.read(buf)) != -1) baos.write(buf, 0, n);
                        is.close();
                        String b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                        json = "{\"type\":\"image\",\"data\":\"" + b64 + "\"}";
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        } else if ("text/plain".equals(type)) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null) {
                String safe = text.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
                json = "{\"type\":\"url\",\"data\":\"" + safe + "\"}";
            }
        }

        if (json != null) {
            getPreferences(MODE_PRIVATE).edit().putString("pendingShare", json).apply();
        }
    }

    /** Вызывается после инициализации моста — диспатчим отложенный шаринг. */
    @Override
    protected void load() {
        super.load();
        String pending = getPreferences(MODE_PRIVATE).getString("pendingShare", null);
        if (pending != null) {
            getPreferences(MODE_PRIVATE).edit().remove("pendingShare").apply();
            final String json = pending;
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('grimoire:share',{detail:" + json + "}))",
                    null
                )
            );
        }
    }

    /** Диспатч когда приложение уже запущено (onNewIntent). */
    private void dispatchShareIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();
        if (!Intent.ACTION_SEND.equals(action) || type == null) return;

        String json = null;

        if (type.startsWith("image/")) {
            Uri imageUri = getImageUri(intent);
            if (imageUri != null) {
                try {
                    InputStream is = getContentResolver().openInputStream(imageUri);
                    if (is != null) {
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = is.read(buf)) != -1) baos.write(buf, 0, n);
                        is.close();
                        String b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                        json = "{\"type\":\"image\",\"data\":\"" + b64 + "\"}";
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        } else if ("text/plain".equals(type)) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null) {
                String safe = text.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
                json = "{\"type\":\"url\",\"data\":\"" + safe + "\"}";
            }
        }

        if (json != null) {
            final String finalJson = json;
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('grimoire:share',{detail:" + finalJson + "}))",
                    null
                )
            );
        }
    }

    @SuppressWarnings("deprecation")
    private Uri getImageUri(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
        } else {
            return intent.getParcelableExtra(Intent.EXTRA_STREAM);
        }
    }
}
