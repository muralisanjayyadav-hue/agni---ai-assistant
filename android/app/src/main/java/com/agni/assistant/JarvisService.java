package com.agni.assistant;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.Intent;
import android.os.Build;

@CapacitorPlugin(name = "JarvisService")
public class JarvisService extends Plugin {

    @PluginMethod
    public void enable(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), JarvisBackgroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void disable(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), JarvisBackgroundService.class);
            getContext().stopService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        enable(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        disable(call);
    }
}
