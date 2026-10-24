' Gizli pencerede calistirir: wscript calistir.vbs aff main | aff retry | trendyol
' Once guncelle.ps1 ile GitHub'daki en son kodu ceker, sonra isi calistirir.
Set fso = CreateObject("Scripting.FileSystemObject")
d = fso.GetParentFolderName(WScript.ScriptFullName)
a = ""
For Each x In WScript.Arguments : a = a & " " & x : Next
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = d
q = Chr(34)
sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -File " & q & d & "\guncelle.ps1" & q, 0, True
sh.Run "cmd /c node " & q & d & "\src\main.js" & q & a & " >> " & q & d & "\logs\konsol.log" & q & " 2>&1", 0, True