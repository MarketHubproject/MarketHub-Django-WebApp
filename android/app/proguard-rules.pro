# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# react-native-config
-keep class com.lugg.ReactNativeConfig.ReactNativeConfigPackage { *; }

# React Native ProGuard Configuration

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.soloader.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep React Native performance monitoring
-keep class com.shopify.reactnativeperformance.** { *; }

# Keep MMKV
-keep class com.tencent.mmkv.** { *; }

# Keep background fetch
-keep class com.transistorsoft.rnbackgroundfetch.** { *; }

# Keep Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep Notifee
-keep class app.notifee.** { *; }

# Keep Stream Chat
-keep class io.getstream.** { *; }
-dontwarn io.getstream.**

# Keep Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# Keep WebView
-keep class com.reactnativecommunity.webview.** { *; }

# Keep DeviceInfo
-keep class com.learnium.RNDeviceInfo.** { *; }

# Keep Branch
-keep class io.branch.** { *; }
-dontwarn io.branch.**

# Remove logs in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
