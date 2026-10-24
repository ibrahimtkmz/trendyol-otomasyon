# Her calismadan once GitHub'daki en son kodu ceker. Hata olursa program mevcut kodla devam eder.
$ErrorActionPreference = 'Continue'
$d = Split-Path -Parent $MyInvocation.MyCommand.Path
$git = 'C:\Program Files\Git\cmd\git.exe'
$log = Join-Path $d 'logs\guncelleme.log'
function Y($m) { Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) -Encoding UTF8 }
if (-not (Test-Path $git)) { Y 'git bulunamadi, guncelleme atlandi'; exit 0 }
Set-Location $d
$j = Start-Job { param($g,$d) Set-Location $d; & $g fetch -q origin main 2>&1 } -ArgumentList $git,$d
if (-not (Wait-Job $j -Timeout 60)) { Stop-Job $j; Y 'GitHub yanit vermedi (60 sn), mevcut kodla devam'; exit 0 }
$out = Receive-Job $j; if ($out) { Y "fetch: $out" }
$yerel = (& $git rev-parse HEAD).Trim(); $uzak = (& $git rev-parse origin/main 2>$null)
if (-not $uzak) { Y 'origin/main okunamadi'; exit 0 }
if ($yerel -eq $uzak.Trim()) { exit 0 }
$degisen = & $git status --porcelain --untracked-files=no
if ($degisen) { Y "Yerelde kaydedilmemis degisiklik var, guncelleme atlandi: $($degisen -join ', ')"; exit 0 }
$r = & $git merge --ff-only origin/main 2>&1
if ($LASTEXITCODE -eq 0) { Y "Guncellendi: $($yerel.Substring(0,7)) -> $($uzak.Trim().Substring(0,7))" } else { Y "Guncelleme basarisiz: $r" }