' Gizli pencerede calistirir: wscript calistir.vbs aff main | aff retry | trendyol
Set fso = CreateObject("Scripting.FileSystemObject")
d = fso.GetParentFolderName(WScript.ScriptFullName)
a = ""
For Each x In WScript.Arguments : a = a & " " & x : Next
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = d
sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & d & "\guncelle.ps1"""", 0, True
sh.Run "cmd /c node """ & d & "\src\main.js""" & a & " >> """ & d & "\logs\konsol.log"" 2>&1", 0, True
