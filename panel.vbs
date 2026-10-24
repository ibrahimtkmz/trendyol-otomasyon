Set fso = CreateObject("Scripting.FileSystemObject")
d = fso.GetParentFolderName(WScript.ScriptFullName)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = d
sh.Run "cmd /c node """ & d & "\src\panel.js"" >> """ & d & "\logs\panel.log"" 2>&1", 0, False