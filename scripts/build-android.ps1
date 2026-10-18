$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$source=Join-Path $root 'android'
$build=Join-Path $root 'build/android'
$jdk=$env:JAVA_HOME
$sdk=$env:ANDROID_HOME
if(-not $sdk){$sdk=$env:ANDROID_SDK_ROOT}
if(-not $jdk -or -not(Test-Path (Join-Path $jdk 'bin/javac.exe'))){throw 'Configura JAVA_HOME con un JDK 17.'}
if(-not $sdk){throw 'Configura ANDROID_HOME con tu Android SDK.'}
$tools=Join-Path $sdk 'build-tools/35.0.0'
$androidJar=Join-Path $sdk 'platforms/android-35/android.jar'
if(-not(Test-Path $androidJar) -or -not(Test-Path (Join-Path $tools 'aapt2.exe'))){throw 'Instala Android Platform 35 y Build Tools 35.0.0 en el SDK.'}
if(-not(Test-Path (Join-Path $source 'assets/index.html'))){throw 'Ejecuta npm run package:mobile primero.'}
New-Item -ItemType Directory -Force $build,(Join-Path $build 'classes'),(Join-Path $build 'dex'),(Join-Path $root 'dist'),(Join-Path $root '.signing') | Out-Null
function Run-Tool([string]$file,[string[]]$arguments){& $file @arguments;if($LASTEXITCODE -ne 0){throw "Error de compilación: $file ($LASTEXITCODE)"}}
Run-Tool (Join-Path $tools 'aapt2.exe') @('compile','--dir',(Join-Path $source 'res'),'-o',(Join-Path $build 'resources.zip'))
Run-Tool (Join-Path $tools 'aapt2.exe') @('link','--auto-add-overlay','-I',$androidJar,'--manifest',(Join-Path $source 'AndroidManifest.xml'),'-R',(Join-Path $build 'resources.zip'),'-A',(Join-Path $source 'assets'),'-o',(Join-Path $build 'unsigned.apk'))
Run-Tool (Join-Path $jdk 'bin/javac.exe') @('-encoding','UTF-8','-source','8','-target','8','-classpath',$androidJar,'-d',(Join-Path $build 'classes'),(Join-Path $source 'src/com/pokerlab/offline/MainActivity.java'))
Run-Tool (Join-Path $jdk 'bin/jar.exe') @('cf',(Join-Path $build 'classes.jar'),'-C',(Join-Path $build 'classes'),'.')
Run-Tool (Join-Path $jdk 'bin/java.exe') @('-cp',(Join-Path $tools 'lib/d8.jar'),'com.android.tools.r8.D8','--lib',$androidJar,'--min-api','23','--output',(Join-Path $build 'dex'),(Join-Path $build 'classes.jar'))
Run-Tool (Join-Path $jdk 'bin/jar.exe') @('uf',(Join-Path $build 'unsigned.apk'),'-C',(Join-Path $build 'dex'),'classes.dex')
Run-Tool (Join-Path $tools 'zipalign.exe') @('-f','-p','4',(Join-Path $build 'unsigned.apk'),(Join-Path $build 'aligned.apk'))
$keystore=$env:POKERLAB_KEYSTORE
if(-not $keystore){
  $keystore=Join-Path $root '.signing/development.jks'
  # Standard development credentials; never use this development key for a store release.
  $env:POKERLAB_STORE_PASS='android'
  $env:POKERLAB_KEY_PASS='android'
  $env:POKERLAB_KEY_ALIAS='pokerlab'
  if(-not(Test-Path $keystore)){Run-Tool (Join-Path $jdk 'bin/keytool.exe') @('-genkeypair','-keystore',$keystore,'-alias','pokerlab','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Poker Lab Development','-storepass:env','POKERLAB_STORE_PASS','-keypass:env','POKERLAB_KEY_PASS')}
}
if(-not $env:POKERLAB_STORE_PASS -or -not $env:POKERLAB_KEY_ALIAS){throw 'Configura POKERLAB_STORE_PASS y POKERLAB_KEY_ALIAS para tu clave de firma.'}
if(-not $env:POKERLAB_KEY_PASS){$env:POKERLAB_KEY_PASS=$env:POKERLAB_STORE_PASS}
$apk=Join-Path $root 'dist/Poker-Lab.apk'
Run-Tool (Join-Path $jdk 'bin/java.exe') @('-jar',(Join-Path $tools 'lib/apksigner.jar'),'sign','--ks',$keystore,'--ks-key-alias',$env:POKERLAB_KEY_ALIAS,'--ks-pass','env:POKERLAB_STORE_PASS','--key-pass','env:POKERLAB_KEY_PASS','--out',$apk,(Join-Path $build 'aligned.apk'))
Run-Tool (Join-Path $jdk 'bin/java.exe') @('-jar',(Join-Path $tools 'lib/apksigner.jar'),'verify','--verbose',$apk)
Write-Output "APK generado: $apk"
