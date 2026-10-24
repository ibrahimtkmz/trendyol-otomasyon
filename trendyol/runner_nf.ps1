[Console]::OutputEncoding=[Text.Encoding]::UTF8
$ser=$(if($env:TY_SER){$env:TY_SER}else{"127.0.0.1:5585"})
$a="C:\Program Files\BlueStacks_nxt\HD-Adb.exe"; $log='C:\Users\user\otomasyon\data\runner.log'
function PDump { $lp="$env:TEMP\rcu.xml"; Remove-Item $lp -EA 0; & $a -s $ser shell "rm -f /sdcard/r.xml; uiautomator dump --compressed /sdcard/r.xml >/dev/null 2>&1" 2>$null | Out-Null; & $a -s $ser pull /sdcard/r.xml $lp 2>$null | Out-Null; if(-not (Test-Path $lp)){ & $a -s $ser shell "rm -f /sdcard/r.xml; export ANDROID_DATA=/data/local/tmp; CLASSPATH=/data/local/tmp/tydump.jar:/system/framework/uiautomator.jar app_process /system/bin TyDump /sdcard/r.xml 300 1500 >/dev/null 2>&1" 2>$null | Out-Null; & $a -s $ser pull /sdcard/r.xml $lp 2>$null | Out-Null }; if(Test-Path $lp){ [IO.File]::ReadAllText($lp,[Text.Encoding]::UTF8) } else { '' } }
function Recover {
  # no app restart, no taps: wait, re-dump a few times; give up with NEEDS_ATTENTION
  "RECOVER_WAIT $(Get-Date -Format o)" | Add-Content $log
  for($r=0;$r -lt 4;$r++){
    Start-Sleep 30
    & $a -s $ser shell "pkill -9 uiautomator" 2>$null | Out-Null
    $x=PDump
    $bl=[regex]::Matches($x,'text="[^"]*Ziyaretçiye ₺[^"]*"[^>]*bounds="\[\d+,(\d+)\]\[\d+,\d+\]"') | ? { [int]$_.Groups[1].Value -gt 330 }
    if($x -match 'Marka Tekliflerim' -and @($bl).Count -gt 0){ "RECOVER_OK try=$r" | Add-Content $log; return $true }
    "RECOVER_RETRY $r $(if($x){'dump_ok_no_cards'}else{'dump_fail'})" | Add-Content $log
  }
  "NEEDS_ATTENTION $(Get-Date -Format o)" | Add-Content $log
  return $false
}
$t=Get-Date; $bad=0
while(((Get-Date)-$t).TotalMinutes -lt 240){
  $n0=(Get-Content C:\Users\user\otomasyon\data\f_new.jsonl).Count
  $o=powershell -ExecutionPolicy Bypass -File C:\Users\user\otomasyon\trendyol\scrape7nf.ps1 -secs 240 2>&1
  $o | Out-String | Add-Content C:\Users\user\otomasyon\data\runner_raw.log -Encoding UTF8
  $o | Select-String '^(VAZGEC|SEARCHOVL|BLOCKTAP|BLOCKSWIPE|NOFILTER|OFFPAGE|NOLINK|NEW|END|SCANNED|DUMPFAIL|TIMEUP)' | % Line | Add-Content $log -Encoding UTF8
  if($o -match '^END'){ 'END' | Add-Content $log; break }
  $n1=(Get-Content C:\Users\user\otomasyon\data\f_new.jsonl).Count
  "cnt $n0->$n1" | Add-Content $log
  if($n1 -eq $n0 -and (@($o -match 'DUMPFAIL|NOMATCH|NOLINK|SKIPCARD').Count -ge 1)){ $bad++ } else { $bad=0 }
  if($bad -ge 2 -or ($o -match 'OFFPAGE' -and $o -notmatch 'NEW')){ if(-not (Recover)){ 'END' | Add-Content $log; break }; $bad=0 }
}
'DONE' | Add-Content $log

