Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = folder
On Error Resume Next
shell.Run "cmd /c node launch.mjs", 0, False
If Err.Number <> 0 Then
  MsgBox "Install Node.js 22.12 or newer, then open this launcher again.", 48, "OhMyPi workspace"
End If
