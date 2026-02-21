package com.pyeonharu.app;

import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int LOCATION_PERMISSION_REQUEST = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ★ 앱 시작 시 위치 권한 요청 (이슈 3)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                },
                LOCATION_PERMISSION_REQUEST);
        }
    }

    @Override
    public void onStart() {
        super.onStart();

        WebView webView = getBridge().getWebView();

        // ★ WebView 위치 권한 자동 허용 (이슈 3)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        // ★ OAuth 등 URL을 앱 내 WebView에서 처리 (이슈 1)
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // 편하루 + OAuth 도메인은 앱 내에서 로드
                if (url.contains("pyeonharu.com") ||
                    url.contains("nid.naver.com") ||
                    url.contains("kauth.kakao.com") ||
                    url.contains("accounts.kakao.com") ||
                    url.contains("accounts.google.com") ||
                    url.contains("supabase.co")) {
                    view.loadUrl(url);
                    return true;
                }

                // 배달앱, 유튜브 등 외부 링크는 시스템 브라우저
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
        });
    }
}
