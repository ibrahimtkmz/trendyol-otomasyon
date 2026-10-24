# Zamanlanmış görevleri tamamen siler (klasör ve veriler kalır)
Get-ScheduledTask -TaskPath '\Otomasyon\' -EA SilentlyContinue | Unregister-ScheduledTask -Confirm:$false; 'Görevler silindi.'
