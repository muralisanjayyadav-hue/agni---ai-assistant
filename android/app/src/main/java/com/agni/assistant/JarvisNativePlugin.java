package com.agni.assistant;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "JarvisNativePlugin")
public class JarvisNativePlugin extends Plugin {

  @PluginMethod
  public void start(PluginCall call) {
    Context context = getContext();
    Intent serviceIntent = new Intent(context, JarvisBackgroundService.class);
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(serviceIntent);
      } else {
        context.startService(serviceIntent);
      }
      call.resolve();
    } catch (Exception e) {
      call.reject("Failed to start JARVIS background service: " + e.getMessage());
    }
  }

  @PluginMethod
  public void stop(PluginCall call) {
    Context context = getContext();
    Intent serviceIntent = new Intent(context, JarvisBackgroundService.class);
    try {
      context.stopService(serviceIntent);
      call.resolve();
    } catch (Exception e) {
      call.reject("Failed to stop JARVIS background service: " + e.getMessage());
    }
  }

  @PluginMethod
  public void openApp(PluginCall call) {
    String pkg = call.getString("packageName");
    if (pkg == null || pkg.isEmpty()) {
      pkg = call.getString("package");
    }
    if (pkg == null || pkg.isEmpty()) {
      call.reject("packageName missing");
      return;
    }
    try {
      PackageManager pm = getContext().getPackageManager();
      Intent i = pm.getLaunchIntentForPackage(pkg);
      if (i != null) {
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        getContext().startActivity(i);
        call.resolve();
      } else {
        Intent mi = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg));
        mi.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(mi);
        call.resolve();
      }
    } catch (Exception e) {
      call.reject(e.getMessage());
    }
  }

  @PluginMethod
  public void openDialer(PluginCall call) {
    try {
      Intent intent = new Intent(Intent.ACTION_DIAL);
      String phone = call.getString("phone");
      if (phone != null && !phone.isEmpty()) {
        intent.setData(Uri.parse("tel:" + phone));
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(intent);
      call.resolve();
    } catch (Exception e) {
      call.reject(e.getMessage());
    }
  }
}
