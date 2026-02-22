package com.pyeonharu.app;

import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.ValueCallback;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST = 1001;

    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraPhotoUri;

    private final ActivityResultLauncher<Intent> fileChooserLauncher =
        registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (filePathCallback == null) return;

                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    Uri dataUri = result.getData().getData();
                    if (dataUri != null) {
                        filePathCallback.onReceiveValue(new Uri[]{dataUri});
                    } else {
                        filePathCallback.onReceiveValue(null);
                    }
                } else if (result.getResultCode() == RESULT_OK && cameraPhotoUri != null) {
                    filePathCallback.onReceiveValue(new Uri[]{cameraPhotoUri});
                } else {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = null;
            }
        );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();

        // 권한 요청
        requestAllPermissions();

        WebView webView = getBridge().getWebView();

        // WebView 설정: 팝업/리다이렉트가 WebView 안에서 처리되도록
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
        webView.getSettings().setSupportMultipleWindows(false);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setUserAgentString(
            webView.getSettings().getUserAgentString() + " PyeonharuApp"
        );

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams fileChooserParams) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                boolean isCaptureEnabled = fileChooserParams.isCaptureEnabled();

                if (isCaptureEnabled) {
                    Intent cameraIntent = createCameraIntent();
                    if (cameraIntent != null) {
                        fileChooserLauncher.launch(cameraIntent);
                    } else {
                        filePathCallback.onReceiveValue(null);
                        filePathCallback = null;
                    }
                } else {
                    Intent galleryIntent = new Intent(Intent.ACTION_GET_CONTENT);
                    galleryIntent.addCategory(Intent.CATEGORY_OPENABLE);
                    galleryIntent.setType("image/*");
                    fileChooserLauncher.launch(galleryIntent);
                }

                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // ★ 앱 도메인 → WebView 안에서 처리 (OAuth 콜백 포함)
                if (url.startsWith("https://www.pyeonharu.com") || url.startsWith("https://pyeonharu.com")) {
                    return false; // WebView가 처리
                }

                // ★ OAuth 로그인 페이지들 → WebView 안에서 처리
                // Google, Kakao, Naver 로그인 페이지를 WebView에서 직접 열어야
                // 로그인 완료 후 redirectTo가 WebView 안에서 자연스럽게 처리됨
                if (url.contains("accounts.google.com") ||
                    url.contains("kauth.kakao.com") ||
                    url.contains("accounts.kakao.com") ||
                    url.contains("nid.naver.com") ||
                    url.contains("supabase.co")) {
                    return false; // WebView가 처리
                }

                // 전화 걸기
                if (url.startsWith("tel:")) {
                    Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }

                // 네이버맵 등 외부 앱
                if (url.startsWith("intent:") || url.startsWith("nmap://") || url.startsWith("kakaomap://")) {
                    try {
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        if (intent.resolveActivity(getPackageManager()) != null) {
                            startActivity(intent);
                        } else {
                            String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                            if (fallbackUrl != null) {
                                view.loadUrl(fallbackUrl);
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    return true;
                }

                // 기타 외부 URL → 외부 브라우저
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }

                return false;
            }
        });
    }

    private Intent createCameraIntent() {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
            File photoFile = null;
            try {
                photoFile = createImageFile();
            } catch (IOException e) {
                e.printStackTrace();
            }

            if (photoFile != null) {
                cameraPhotoUri = FileProvider.getUriForFile(
                    this,
                    getApplicationContext().getPackageName() + ".fileprovider",
                    photoFile
                );
                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                return takePictureIntent;
            }
        }
        return null;
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "PYEONHARU_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    private boolean permissionsRequested = false;

    private void requestAllPermissions() {
        if (permissionsRequested) return;
        permissionsRequested = true;

        List<String> permissionsNeeded = new ArrayList<>();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
            permissionsNeeded.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CAMERA);
        }

        if (android.os.Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this,
                permissionsNeeded.toArray(new String[0]),
                PERMISSION_REQUEST);
        }
    }
}
