# Zamanlanmış görevleri açar
Get-ScheduledTask -TaskPath '\Otomasyon\' | Enable-ScheduledTask | Select-Object TaskName,State | Format-Table -AutoSize
