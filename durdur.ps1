# Zamanlanmış görevleri kapatır ve çalışan turu durdurur
Get-ScheduledTask -TaskPath '\Otomasyon\' | ForEach-Object { Stop-ScheduledTask -InputObject $_ -EA SilentlyContinue; Disable-ScheduledTask -InputObject $_ | Out-Null }
$D = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*$D\src\main.js*" } | ForEach-Object { taskkill /T /F /PID $_.ProcessId | Out-Null }
Remove-Item "$D\data\bs4.lock" -EA SilentlyContinue
Get-ScheduledTask -TaskPath '\Otomasyon\' | Select-Object TaskName,State | Format-Table -AutoSize
