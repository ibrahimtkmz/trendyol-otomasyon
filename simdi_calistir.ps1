param([ValidateSet('aff','trendyol')][string]$is='trendyol')
# Bir işi hemen (gizli) başlatır: simdi_calistir.ps1 -is aff   /   -is trendyol
$ad = if ($is -eq 'aff') { 'AFF' } else { 'Trendyol' }
Start-ScheduledTask -TaskPath '\Otomasyon\' -TaskName $ad; "Başlatıldı: $ad (logs klasörünü izleyin)"
