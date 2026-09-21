$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$toolRoot = Join-Path $env:LOCALAPPDATA 'KuldenBuild'
if (-not $env:JAVA_HOME) {
    $jdk = Get-ChildItem (Join-Path $toolRoot 'java') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}
if (-not $env:ANDROID_HOME) {
    foreach ($candidate in @((Join-Path $toolRoot 'sdk'), (Join-Path $env:LOCALAPPDATA 'Android\Sdk'))) {
        if (Test-Path -LiteralPath $candidate) { $env:ANDROID_HOME = $candidate; break }
    }
}
if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) {
    throw 'JDK 21 ve Android SDK gerekli. JAVA_HOME ve ANDROID_HOME yollarini ayarlayin.'
}
$env:DEBUG = ''
& npm.cmd run android:sync
if ($LASTEXITCODE -ne 0) { throw 'Web derlemesi veya Capacitor senkronizasyonu basarisiz.' }
Push-Location (Join-Path $projectRoot 'android')
try {
    & .\gradlew.bat --build-cache '-Pandroid.overridePathCheck=true' assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'Android APK derlemesi basarisiz.' }
} finally {
    Pop-Location
}
$outputDir = Join-Path $projectRoot 'artifacts'
New-Item -ItemType Directory -Force $outputDir | Out-Null
$apk = Join-Path $outputDir 'Farming.apk'
Copy-Item -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk') -Destination $apk -Force
Write-Output "APK: $apk"
