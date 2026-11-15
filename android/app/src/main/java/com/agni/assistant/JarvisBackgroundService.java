package com.agni.assistant;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class JarvisBackgroundService extends Service {

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(1, createNotification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } else {
                startForeground(1, createNotification());
            }
        } catch (Exception e) {
            try {
                startForeground(1, createNotification());
            } catch (Exception ignored) {}
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createChannel();
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(1, createNotification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } else {
                startForeground(1, createNotification());
            }
        } catch (Exception e) {
            try {
                startForeground(1, createNotification());
            } catch (Exception ignored) {}
        }
        return START_STICKY;
    }

    private Notification createNotification() {
        int icon = getApplicationInfo().icon != 0 ? getApplicationInfo().icon : R.mipmap.ic_launcher;
        return new NotificationCompat.Builder(this, "jarvis")
            .setContentTitle("🔥 JARVIS V13 Active")
            .setContentText("Listening Sir - Founder M. Sanjay")
            .setSmallIcon(icon)
            .setOngoing(true)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel("jarvis", "JARVIS", NotificationManager.IMPORTANCE_LOW);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(ch);
            }
        }
    }

    @Override
    public IBinder onBind(Intent i) {
        return null;
    }
}
