param([string]$t='Otomasyon',[string]$f='')
# Windows bildirimi (toast). Mesaj metni dosyadan okunur.
try {
  $m = ''; if ($f -and (Test-Path $f)) { $m = [IO.File]::ReadAllText($f,[Text.Encoding]::UTF8); Remove-Item $f -EA SilentlyContinue }
  if ($m.Length -gt 600) { $m = $m.Substring(0,600) + '...' }
  [Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime] | Out-Null
  $x = New-Object Windows.Data.Xml.Dom.XmlDocument
  $x.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$([Security.SecurityElement]::Escape($t))</text><text>$([Security.SecurityElement]::Escape($m))</text></binding></visual></toast>")
  $app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($x))
} catch {}
