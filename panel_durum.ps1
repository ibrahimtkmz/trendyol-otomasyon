$ErrorActionPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
$g=@(Get-ScheduledTask -TaskPath '\Otomasyon\' | ForEach-Object { $i=$_|Get-ScheduledTaskInfo; [pscustomobject]@{ad=$_.TaskName;durum=[string]$_.State;son=$(if($i.LastRunTime -and $i.LastRunTime.Year -gt 2000){$i.LastRunTime.ToString('yyyy-MM-dd HH:mm:ss')}else{''});sonuc=$i.LastTaskResult;sonraki=$(if($i.NextRunTime){$i.NextRunTime.ToString('yyyy-MM-dd HH:mm:ss')}else{''})} })
$p=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'main\.js' } | ForEach-Object { [pscustomobject]@{pid=$_.ProcessId;cmd=$_.CommandLine;bas=$_.CreationDate.ToString('yyyy-MM-dd HH:mm:ss')} })
@{gorevler=$g;surecler=$p} | ConvertTo-Json -Depth 4 -Compress