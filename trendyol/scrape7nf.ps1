param([int]$secs=300,[switch]$one)
[Console]::OutputEncoding=[Text.Encoding]::UTF8
$a="C:\Program Files\BlueStacks_nxt\HD-Adb.exe"; $ser=$(if($env:TY_SER){$env:TY_SER}else{"127.0.0.1:5585"}); $t0=Get-Date
$sf='C:\Users\user\otomasyon\data\f_seen.txt'; $rf='C:\Users\user\otomasyon\data\f_new.jsonl'
function Sh($c){ foreach($t in [regex]::Matches($c,'input tap (\d+) (\d+)')){ if([int]$t.Groups[2].Value -lt 250 -and -not ([int]$t.Groups[1].Value -ge 600 -and $c -match '^input tap \d+ \d+; sleep 1$')){ "BLOCKTAP $c"; return } }; foreach($t in [regex]::Matches($c,'input swipe \d+ (\d+)')){ if([int]$t.Groups[1].Value -lt 250){ "BLOCKSWIPE $c"; return } }; foreach($t in [regex]::Matches($c,'input tap (\d+) (\d+)')){ $tx=[int]$t.Groups[1].Value;$ty=[int]$t.Groups[2].Value; foreach($m in [regex]::Matches($script:lastX,'text="(Detayı Göster|Detayı Gizle|Listeden Kaldır|Ürünleri İncele[^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')){ if($tx -ge [int]$m.Groups[2].Value -and $tx -le [int]$m.Groups[4].Value -and $ty -ge [int]$m.Groups[3].Value -and $ty -le [int]$m.Groups[5].Value -and $m.Groups[1].Value -ne 'Listeden Kaldır'){ "BLOCKDETAY $c"; return } } }; & $a -s $ser shell $c 2>$null | Out-Null }
function Vz($x){ foreach($m in [regex]::Matches($x,'<node [^>]*>')){ $n=$m.Value; if($n -notmatch '(?i)(text|content-desc)="vazge'){ continue }; $b=[regex]::Match($n,'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'); if(-not $b.Success){ continue }; $x1=[int]$b.Groups[1].Value;$y1=[int]$b.Groups[2].Value;$x2=[int]$b.Groups[3].Value;$y2=[int]$b.Groups[4].Value; if($x2 -le $x1 -or $y2 -le $y1 -or $x1 -lt 600 -or $y2 -gt 250){ continue }; $cx=[int](($x1+$x2)/2);$cy=[int](($y1+$y2)/2); "VAZGEC $cx $cy"; Sh "input tap $cx $cy; sleep 1"; return $true }; return $false }
function DumpFb { $lp="$env:TEMP\tyu.xml"; Remove-Item $lp -EA 0; & $a -s $ser shell "rm -f /sdcard/u.xml; export ANDROID_DATA=/data/local/tmp; CLASSPATH=/data/local/tmp/tydump.jar:/system/framework/uiautomator.jar app_process /system/bin TyDump /sdcard/u.xml 300 1500 >/dev/null 2>&1" 2>$null | Out-Null; & $a -s $ser pull /sdcard/u.xml $lp 2>$null | Out-Null; if(Test-Path $lp){ $x=[IO.File]::ReadAllText($lp,[Text.Encoding]::UTF8); if($x -match '</hierarchy>'){ $script:lastX=$x; return $x } }; return '' }
function Dump0 { $lp="$env:TEMP\tyu.xml"; for($i=0;$i -lt 6;$i++){ if(-not $script:useFb){ Remove-Item $lp -EA 0; & $a -s $ser shell "rm -f /sdcard/u.xml; uiautomator dump --compressed /sdcard/u.xml >/dev/null 2>&1" 2>$null | Out-Null; & $a -s $ser pull /sdcard/u.xml $lp 2>$null | Out-Null; if(Test-Path $lp){ $x=[IO.File]::ReadAllText($lp,[Text.Encoding]::UTF8); if($x -match '</hierarchy>'){ $script:lastX=$x; return $x } } }; $x=DumpFb; if($x){ if(-not $script:useFb){ $script:useFb=$true; [Console]::Out.WriteLine('FALLBACK_DUMP_ON') }; return $x }; if($i -eq 2){ & $a -s $ser shell "pkill uiautomator" 2>$null | Out-Null }; Start-Sleep -Milliseconds 500 }; return '' }
function Dump { $x=Dump0; if($x -and (Vz $x)){ $x=Dump0 }; return $x }
function Nodes($x){ [regex]::Matches($x,'<node [^>]*>') | % { $n=$_.Value; $t=[regex]::Match($n,' text="([^"]*)"').Groups[1].Value; $b=[regex]::Match($n,'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'); if($t -and $b.Success){ [pscustomobject]@{t=[System.Net.WebUtility]::HtmlDecode($t);x1=[int]$b.Groups[1].Value;y1=[int]$b.Groups[2].Value;x2=[int]$b.Groups[3].Value;y2=[int]$b.Groups[4].Value} } } | ? { $_.y2 -gt 0 -and $_.y1 -lt 1600 } }
function Num($v){ $v=$v -replace '[₺\s]',''; $m=1; if($v -match 'K$'){ $m=1000; $v=$v.TrimEnd('K') }; [int]([double]::Parse($v,[Globalization.CultureInfo]::InvariantCulture)*$m) }
$keys=@{}; Get-Content C:\Users\user\otomasyon\data\keys.txt -Encoding UTF8 -EA 0 | % { if($_){ $keys[$_]=1 } }
$seen=@{}; if(Test-Path $sf){ Get-Content $sf -Encoding UTF8 | % { if($_){ $seen[$_]=1 } } }
$stale=0; $same=0; $nf=0; $script:lastfp=''; $scan=0; $memS=@{}; $memI=@{}; $off=0
$script:lastX=''; $nmc=@{}; $lb=@{}; Get-Content $rf -Encoding UTF8 -EA 0 | % { $mm=[regex]::Match($_,'"brand":"([^"]*)".*"link":"([^"]+)"'); if($mm.Success){ $keys[$mm.Groups[2].Value]=1; $lb[$mm.Groups[2].Value]=[regex]::Unescape($mm.Groups[1].Value) } }
while($true){
  if(((Get-Date)-$t0).TotalSeconds -gt $secs){ 'TIMEUP'; break }
  $x=Dump
  if(-not $x){ 'DUMPFAIL'; Start-Sleep 2; Sh "input swipe 450 1000 450 850 300"; continue }
  if($x -match 'text="Kopyala"'){ Sh "input keyevent 4; sleep 1"; continue }
  if($x -notmatch 'Marka Tekliflerim'){ $off++; 'OFFPAGE'; [IO.File]::WriteAllText("C:\Users\user\otomasyon\data\offpage_$off.xml",$x); if($off -gt 2){ 'NEEDS_ATTENTION offpage'; 'END'; break }; Start-Sleep 5; continue }; $off=0
  if(Vz $x){ 'SEARCHOVL'; continue }; $nb=([regex]::Matches($x,'Ziyaretçiye ₺[^"]*"[^>]*bounds="\[(?!0,0\]\[0,0\])')).Count
  if($nb -lt 1){ $nf++; 'NOFILTER'; $fq=([regex]::Matches($x,' text="([^"]+)"') | % { $_.Groups[1].Value }) -join '|'; if($fq -eq $script:lastnf){ $script:nsame++ } else { $script:nsame=0 }; $script:lastnf=$fq; if($script:nsame -ge 3 -or $nf -ge 200){ 'END'; break }; Sh "input swipe 450 1300 450 500 800; sleep 2"; continue }; $nf=0
  $ns=@(Nodes $x); $pays=@($ns | ? { $_.t -eq 'Paylaş' -and $_.y2 -lt 1440 -and $_.y1 -gt 330 } | sort y1)
  $new=0; $prev=260; $redump=$false
  for($i=0;$i -lt $pays.Count;$i++){
    if(((Get-Date)-$t0).TotalSeconds -gt $secs+60){ 'TIMEUP'; exit }; $pay=$pays[$i]; $top=$pay.y1-520; $pp=@($ns | ? { $_.t -eq 'Paylaş' -and $_.y1 -lt ($pay.y1-50) } | sort y1); if($pp.Count){ $py=$pp[$pp.Count-1].y2; if($py -gt $top){ $top=$py } }; if($top -lt 330){ $top=330 }; $bot=$pay.y2
    if($i+1 -lt $pays.Count){ $bot=$pays[$i+1].y1 }
    $card=@($ns | ? { $_.y1 -ge ($top-20) -and $_.y1 -lt $bot -and $_.y2 -le 1449 } | sort y1,x1)
    $bon=$card | ? { $_.t -match 'Ziyaretçiye ₺' } | select -First 1
    if(-not $bon){ continue }
    $bm=[regex]::Match($bon.t,'([\d.]+K?) Ziyaretçiye ₺([\d.]+K?) Bonus'); $V=Num $bm.Groups[1].Value; $B=Num $bm.Groups[2].Value
    $hdr=@($card | ? { $_.y1 -le $pay.y1 })
    $brand=($hdr | ? { $_.y1 -gt $bon.y1 -and $_.x1 -ge 60 -and $_.x1 -lt 120 -and $_.t -notmatch 'Takipçi|^%|Satıcı' } | select -First 1).t
    if(-not $brand){ $brand=($hdr | ? { $_.t -match '^[A-Za-zÇĞİÖŞÜçğıöşü0-9 &.''-]{2,40}$' -and $_.t -notmatch 'Ekim|Ziyaret|Bonus|Komisyon|Link |Ürün|Paylaş|Detay|Yayında|Akıllı|Son 3|Mağaza|Ürün Grubu|Hızlı|Başarılı|Çok |Takipçi' } | select -First 1).t }
    $pcts=@($hdr | ? { $_.t -match '^%\d+$' -and $_.y1 -gt $bon.y1 } | % { $p=$_; $lab=($hdr | ? { $_.t -match 'Komisyon Oranı|Link İçi|Link Dışı' -and [math]::Abs($_.y1-$p.y1) -lt 10 -and $_.x1 -gt $p.x1 } | select -First 1).t; "$($p.t) $lab" })
    $kom=$pcts -join ' | '; $cnt=($hdr | ? { $_.t -match '^\+\d+ Ürün$' -and $_.y1 -gt $bon.y1 } | select -First 1).t
    $date=$hdr | ? { $_.t -match 'Ekim' -and $_.y1 -gt $bon.y1 } | select -First 1
    if(-not $date){ continue }
    $sig="$brand|$kom|$V|$B|$($date.t)|$cnt"
    if($seen[$sig]){ continue }
    $det=$card | ? { $_.t -match 'ilk\s+[\d.]+\s+influencer' } | select -First 1
    # no detail open (user rule)


    $N=$null; if($det){ $N=Num ([regex]::Match($det.t,'ilk\s+([\d.]+)\s+influencer').Groups[1].Value) }
    # fast: no re-dump for memS
    $all=@($card | % t) -join ' '; $sm=[regex]::Match($all,'([\d.]+K?) ziyaretçi\s+getirdi'); $S= if($memS[$sig]){ $memS[$sig] } else { 0 }
    $I=$memI[$sig]
    $key="$($brand.ToUpper())|$(($kom -split ' ')[0])|$V|$B|$($date.t)"
    if($keys[$key]){ $seen[$sig]=1; Add-Content $sf $sig -Encoding UTF8; continue }
    $g=''; $bt=@($card | ? { $_.y1 -lt $bon.y1 } | % t) -join ' '; $gm=[regex]::Match($bt,'Son 3 günde\s+(.+?)\s+(getirdi|kazandırdı|paylaştı)'); if($gm.Success){ $g="$($gm.Groups[1].Value) $($gm.Groups[2].Value)" }
    $link=''; $dupl=$false; $redump=$false
    for($att=0;$att -lt 4 -and -not $link;$att++){
      for($z=0;$z -lt 4;$z++){ try { Set-Clipboard -Value "x$(Get-Random)" -EA Stop; break } catch { Start-Sleep -Milliseconds 300 } }; $prevc=(Get-Clipboard -EA 0) -join ''
      $pay=$null; $fx=Dump0; if($fx){ $fn=@(Nodes $fx); foreach($bq in @($fn | ? { $_.t -eq $brand -and $_.x1 -ge 60 -and $_.x1 -lt 140 } | sort y1)){ $ab=$fn | ? { $_.t -match 'Ziyaretçiye ₺' -and $_.y1 -lt $bq.y1 -and $_.y1 -gt ($bq.y1-150) } | sort y1 -Descending | select -First 1; if(-not $ab -or $ab.t -ne $bon.t){ continue }; $nx=$fn | ? { $_.t -match 'Ziyaretçiye ₺' -and $_.y1 -gt $bq.y1 } | sort y1 | select -First 1; $lim= if($nx){ $nx.y1 } else { 1450 }; $cp=$fn | ? { $_.t -eq 'Paylaş' -and $_.y1 -gt $bq.y1 -and $_.y1 -lt $lim -and $_.y1 -gt 330 -and $_.y2 -lt 1440 } | sort y1 | select -First 1; if($cp){ $pay=$cp; break } } }
      if(-not $pay){ "NOMATCH $brand"; $nmc[$sig]++; if($nmc[$sig] -ge 3){ "SKIPCARD $brand"; $seen[$sig]=1; Add-Content $sf $sig -Encoding UTF8 } else { Sh "input swipe 450 1000 450 800 800; sleep 1"; $redump=$true }; break }
      Sh "input tap $([int](($pay.x1+$pay.x2)/2)) $([int](($pay.y1+$pay.y2)/2))"; Start-Sleep -Milliseconds 2500; $sx=Dump0; $kp=[regex]::Match($sx,'text="Kopyala"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'); if(-not $kp.Success){ "NOSHEET $brand"; Start-Sleep 1; continue }; Sh "input tap $(([int]$kp.Groups[1].Value+[int]$kp.Groups[3].Value)/2) $(([int]$kp.Groups[2].Value+[int]$kp.Groups[4].Value)/2)"
      for($w=0;$w -lt 15 -and ($link -notmatch 'ty\.gl' -or $link -eq $prevc);$w++){ Start-Sleep -Milliseconds 300; try { $link=((Get-Clipboard -EA Stop) -join '').Trim() } catch { $link='' } }
      if($link -eq $prevc -or $link -notmatch 'ty\.gl'){ "NOLINK $brand"; $link=''; $dx=Dump0; if($dx -match 'text="Kopyala"'){ Sh "input keyevent 4; sleep 1" } } elseif($keys[$link]){ if($lb[$link] -eq $brand){ "SAMESTORE $brand $link"; $script:lastLink=$link } else { "MISMATCH $brand got $($lb[$link]) $link"; $link=''; $nmc[$sig]++; if($nmc[$sig] -ge 3){ "SKIPCARD $brand"; $seen[$sig]=1; Add-Content $sf $sig -Encoding UTF8; break } } } else { $script:lastLink=$link }
    }
    if($redump){ break }
    $kup=(@($card | ? { $_.t -match '(?i)kupon|indirim kodu|\bkod\b|sepette' -or ($_.t -cmatch '^[A-Z0-9]{5,}$' -and $_.t -ne $brand.ToUpper() -and $_.t -ne $brand) } | % t) | select -Unique) -join ' / '
    if($dupl){ $seen[$sig]=1; Add-Content $sf $sig -Encoding UTF8; continue }
    if(-not $link){ "NOLINK_KEEP $brand"; continue }
    if($keys["$link|$sig"]){ $seen[$sig]=1; Add-Content $sf $sig -Encoding UTF8; continue }
    $seen[$sig]=1; Add-Content $sf $sig -Encoding UTF8; $keys[$key]=1; $keys[$link]=1
    ([ordered]@{brand=$brand;V=$V;B=$B;kom=$kom;period=$date.t;g=$g;link=$link;N=$N;S=$S;I=$I;kup=$kup} | ConvertTo-Json -Compress) | Add-Content $rf -Encoding UTF8
    "NEW $brand N=$N S=$S $link"; $new++; $scan++
    if($one){ exit }
    break
  }
  if($new -gt 0){ $stale=0; continue }
  if($redump){ continue }
  # all unseen cards on this screen are done -> slow drag (no fling) of up to 3 cards:
  # move the last processable card's Paylas to just above the processable zone (y=330),
  # so the next screen starts with the card right below the last processed one
  $fp=([regex]::Matches($x,' text="([^"]+)"[^>]*bounds="\[\d+,([1-9]\d*)\]') | % { $_.Groups[1].Value } | ? { $_ -cnotmatch 'Son 3 g|ziyaret.i$|getirdi|influencer|payla.t.!|kazand.rd.|^.?[\d.,]+K?$' }) -join '|'
  if($fp -eq $script:lastfp){ $same++ } else { $same=0 }; $script:lastfp=$fp
  $vb=@($ns | ? { $_.t -match 'Ziyaretçiye ₺' -and $_.y1 -gt 0 } | sort y1); $ch=327; $ds=@(for($q=1;$q -lt $vb.Count;$q++){ $vb[$q].y1-$vb[$q-1].y1 }) | ? { $_ -gt 200 -and $_ -lt 800 } | sort; if($ds){ $ch=$ds[0] }
  if($pays.Count -gt 0){ $dy=$pays[$pays.Count-1].y1-300 } else { $dy=$ch }; if($dy -gt 3*$ch){ $dy=3*$ch }; if($dy -lt 150){ $dy=150 }
  $sy=1380; $ey=$sy-$dy; "SCROLL cards=$($pays.Count) ch=$ch dy=$dy"
  Sh "input swipe 450 $sy 450 $ey 1500; sleep 1"
  $stale++; if($same -ge 3 -or $stale -ge 400){ 'END'; break }
}
"SCANNED_THIS_RUN $scan TOTAL_SEEN $($seen.Count)"
