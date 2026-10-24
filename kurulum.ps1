param([switch]$SadeceGorev, [switch]$SadeceGiris, [switch]$GorevKurma, [switch]$GirisAtla)
# Tek seferlik kurulum. Kullanım: sağ tık > PowerShell ile çalıştır   ya da
#   powershell -ExecutionPolicy Bypass -File kurulum.ps1
#   -SadeceGorev : sadece zamanlanmış görevleri (config.json saatleriyle) yeniden kaydeder
#   -SadeceGiris : sadece Trendyol girişini tekrar yaptırır
$ErrorActionPreference = 'Stop'
$D = Split-Path -Parent $MyInvocation.MyCommand.Path; Set-Location $D
$cfg = Get-Content "$D\config.json" -Raw -Encoding UTF8 | ConvertFrom-Json
New-Item -ItemType Directory -Force "$D\logs","$D\data" | Out-Null
Write-Host '=== Otomasyon kurulumu ===' -ForegroundColor Cyan
if ($SadeceGiris) { & node "$D\src\main.js" giris; exit }
if (-not $SadeceGorev) {
  if (-not (Get-Command node -EA SilentlyContinue)) { Write-Host 'Node.js bulunamadı. https://nodejs.org adresinden LTS sürümünü kurup bu betiği tekrar çalıştırın.' -ForegroundColor Red; exit 1 }
  Write-Host '1) Paketler kuruluyor (playwright)...'
  & npm install --no-audit --no-fund; if ($LASTEXITCODE) { throw 'npm install başarısız' }
  Write-Host '2) Tarayıcı (Chromium) indiriliyor...'
  & npx playwright install chromium; if ($LASTEXITCODE) { throw 'playwright install başarısız' }
  if (-not (Test-Path $cfg.adb)) { Write-Warning "ADB bulunamadı: $($cfg.adb)  (config.json içindeki adb yolunu düzeltin)" }
  if (Test-Path "$D\service_account.json") {
    Write-Host '3) Google Sheets bağlantısı test ediliyor...'; & node "$D\src\main.js" test
    $em = (Get-Content "$D\service_account.json" -Raw | ConvertFrom-Json).client_email
    Write-Host "   Servis hesabı: $em  (iki tabloyu bu adresle Düzenleyen olarak paylaşın)"
  } else { Write-Warning '3) service_account.json yok. README_TR.txt adım 1-2 yi yapıp bu betiği tekrar çalıştırın.' }
  if (-not $GirisAtla) {
    Write-Host '4) Trendyol girişi: birazdan bir tarayıcı penceresi açılacak. Trendyol hesabınıza giriş yapın, sonra pencereyi kapatın.' -ForegroundColor Yellow
    Read-Host 'Hazır olunca Enter tuşuna basın' | Out-Null
    & node "$D\src\main.js" giris
  }
}
if (-not $GorevKurma) {
  Write-Host '5) Zamanlanmış görevler kaydediliyor (gizli pencere)...'
  $set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3)
  function Kaydet($ad, $arg, $saatler) {
    $trg = @(); foreach ($s in $saatler) { $trg += New-ScheduledTaskTrigger -Daily -At $s }
    $act = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$D\calistir.vbs`" $arg" -WorkingDirectory $D
    Register-ScheduledTask -TaskPath '\Otomasyon\' -TaskName $ad -Action $act -Trigger $trg -Settings $set -Force | Out-Null
    Write-Host "   $ad : $($saatler -join ', ')"
  }
  Kaydet 'AFF' 'aff main' $cfg.zamanlar.aff
  Kaydet 'AFF_Tekrar' 'aff retry' $cfg.zamanlar.affTekrar
  Kaydet 'Trendyol' 'trendyol' $cfg.zamanlar.trendyol
}
Write-Host 'Kurulum tamam. Loglar: logs klasörü, bildirimler: logs\bildirimler.txt' -ForegroundColor Green
