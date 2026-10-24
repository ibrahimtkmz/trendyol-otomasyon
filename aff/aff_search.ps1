param([string]$s,[string]$name,[string]$brands,[switch]$back)
# Per-brand read (read-only): Raporlar > Marka Is Birliklerim > Komisyonlu Marka Teklifleri > "Satici ismi ile ara".
# For each brand: search, take top-most brand-matching card with "Yayında"; save Ziyaretci + Toplam Kazanc.
# -brands: UTF-8 file path or "A;B;C". Output: C:\Users\user\otomasyon\data\srch_<name>.json
[Console]::OutputEncoding=[Text.Encoding]::UTF8
$a='C:\Program Files\BlueStacks_nxt\HD-Adb.exe'
$f="$env:TEMP\affs_$name.xml"
function Sh($c){ & $a -s $s shell $c 2>&1 | Out-Null }
function Dump { for($i=0;$i -lt 3;$i++){ & $a -s $s shell "rm -f /sdcard/as.xml; uiautomator dump /sdcard/as.xml" 2>&1 | Out-Null; Remove-Item $f -EA SilentlyContinue; & $a -s $s pull /sdcard/as.xml $f 2>&1 | Out-Null; if(Test-Path $f){ $x=[IO.File]::ReadAllText($f,[Text.Encoding]::UTF8); if($x.Length -gt 2000){return $x} }; Start-Sleep 2 }; '' }
function Nodes($x){ [regex]::Matches($x,'text="([^"]*)"[^>]*?class="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"') }
function Ctr($n){ "$([int](([int]$n.Groups[4].Value+[int]$n.Groups[6].Value)/2)) $([int](([int]$n.Groups[5].Value+[int]$n.Groups[7].Value)/2))" }
function TapText($t,$w=5){ for($i=0;$i -lt 3;$i++){ $x=Dump; $m=@(Nodes $x | ? { ($_.Groups[1].Value -eq $t -or $_.Groups[3].Value -eq $t) -and [int]$_.Groups[6].Value -gt 0 }); if($m.Count){ Sh "input tap $(Ctr $m[0])"; Start-Sleep $w; return $true }; Start-Sleep 3 }; $false }
function Fold($t){ $t=$t.Replace('İ','I').Replace('ı','i'); foreach($p in @(@('ş','s'),@('Ş','S'),@('ğ','g'),@('Ğ','G'),@('ü','u'),@('Ü','U'),@('ö','o'),@('Ö','O'),@('ç','c'),@('Ç','C'))){ $t=$t.Replace($p[0],$p[1]) }; $t }
function Norm($t){ ((Fold $t).ToLowerInvariant() -replace '[^a-z0-9]','') }
function Nav { if(-not (TapText 'Raporlar' 10)){ return $false }; if(-not (TapText 'Marka İş Birliklerim' 7)){ return $false }; TapText 'Komisyonlu Marka Teklifleri' 4 | Out-Null; $true }
function Box { for($i=0;$i -lt 3;$i++){ $x=Dump; $e=@(Nodes $x | ? { $_.Groups[2].Value -eq 'android.widget.EditText' -and [int]$_.Groups[6].Value -gt 0 }); if($e.Count){ return $e[0] }; if($i -eq 0){ Sh "input swipe 450 400 450 1400 150"; Start-Sleep 2 } else { Nav | Out-Null } }; $null }
function Parse($x){
  $t=@([regex]::Matches($x,'text="([^"]+)"') | % { [Net.WebUtility]::HtmlDecode($_.Groups[1].Value).Trim() } | ? { $_ -ne '' -and $_ -ne ':' -and $_ -ne '-' })
  $recs=@()
  for($i=1;$i -lt $t.Count;$i++){
    if($t[$i] -match '^%(\d+) Komisyon$'){
      $r=[ordered]@{brand=$t[$i-1];pct=[int]$matches[1];start=$t[$i+1];end=$t[$i+2];status=$t[$i+3];visitors=$null;kazanc=$null}
      for($k=$i+1;$k -lt [Math]::Min($t.Count,$i+30);$k++){
        if($t[$k] -match '^%\d+ Komisyon$'){break}
        if($t[$k] -eq 'Ziyaretçi' -and $r.visitors -eq $null){ $r.visitors=$t[$k+1] }
        if($t[$k] -eq 'Toplam Kazanç' -and $r.kazanc -eq $null){ $r.kazanc=$t[$k+1] }
      }
      $recs+=[pscustomobject]$r
    }
  }
  ,$recs
}
function Clear-Box($bx){ Sh "input tap $(Ctr $bx)"; Start-Sleep 1; Sh ("input keyevent 123 " + ((1..40 | % {'67'}) -join ' ')) }
$t0=Get-Date
if(Test-Path $brands){ $brands=([IO.File]::ReadAllText($brands,[Text.Encoding]::UTF8)).Trim() }
$x=Dump
if($x -notmatch 'Komisyonlu Marka Teklifleri'){ if(-not (Nav)){ "NAVFAIL"; exit 2 } } else { TapText 'Komisyonlu Marka Teklifleri' 4 | Out-Null }
$res=[ordered]@{}
foreach($b in ($brands -split ';' | % { $_.Trim() } | ? { $_ })){
  $fw=@(((Fold $b).ToLowerInvariant() -replace '[^a-z0-9 ]','').Split(' ') | ? { $_.Length -ge 3 })
  $qs=@(); if($fw.Count){ $qs+=$fw[0] }
  $runs=@([regex]::Matches($b,'[A-Za-z0-9]{4,}') | % { $_.Value.ToLowerInvariant() } | Sort-Object Length -Descending); if($runs.Count){ $qs+=$runs[0] }
  $qs+=$fw; $qs=@($qs | ? { $_ } | Select-Object -Unique)
  $nb=Norm $b; $hit=$null; $top=$null; $recs=@(); $nobox=$true
  foreach($q in $qs){
    $bx=Box; if(-not $bx){ continue }; $nobox=$false
    Clear-Box $bx; Sh "input text $q"; Start-Sleep 1; Sh "input keyevent 66"; Start-Sleep 5
    $recs=Parse (Dump)
    $m=@($recs | ? { (Norm $_.brand).StartsWith($nb) -or $nb.StartsWith((Norm $_.brand)) })
    if(-not $top -and $m.Count){ $top=$m[0] }
    $hit=@($m | ? { $_.status -eq 'Yayında' }) | Select-Object -First 1
    if($hit){ break }
  }
  if($hit){ $res[$b]=$hit }
  elseif($nobox){ $res[$b]=[ordered]@{error='nosearchbox'} }
  else { $res[$b]=[ordered]@{error='noyayinda';top=$top;queries=($qs -join ',')} }
}
$bx=Box; if($bx){ Clear-Box $bx; Sh "input keyevent 66" }
if($back){ Start-Sleep 2; TapText 'Marka Teklifleri' 5 | Out-Null }
$out="C:\Users\user\otomasyon\data\srch_$name.json"
$res | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 $out
"DONE $name $([int]((Get-Date)-$t0).TotalSeconds)s -> $out"
