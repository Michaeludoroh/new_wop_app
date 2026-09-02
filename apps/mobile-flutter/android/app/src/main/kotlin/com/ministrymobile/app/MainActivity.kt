package com.ministrymobile.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createDefaultNotificationChannel()
    }

    // Matches default_notification_channel_id in AndroidManifest so FCM
    // notification messages are shown on Android 8+ instead of being dropped.
    private fun createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val channel = NotificationChannel(
            getString(R.string.default_notification_channel_id),
            getString(R.string.default_notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        )
        getSystemService(NotificationManager::class.java)
            ?.createNotificationChannel(channel)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "wopp/system_settings",
        ).setMethodCallHandler { call, result ->
            if (call.method == "openNotificationSettings") {
                val intent = Intent().apply {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                        putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
                    } else {
                        action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                        data = Uri.parse("package:$packageName")
                    }
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
                result.success(true)
            } else {
                result.notImplemented()
            }
        }
    }
}
