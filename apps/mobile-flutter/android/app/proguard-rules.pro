# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# Firebase / Play Billing (keep plugin entry points)
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Crashlytics / NDK symbolication helpers
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
