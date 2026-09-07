plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.aizhipiantai.app"
    compileSdk = 35

    // Keep Java and Kotlin on the same JVM target.
    // GitHub Actions uses JDK 17, and Kotlin 2.x validates this strictly.
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    defaultConfig {
        applicationId = "com.aizhipiantai.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 4
        versionName = "1.1.0"
    }

    buildTypes {
        release { isMinifyEnabled = false }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
