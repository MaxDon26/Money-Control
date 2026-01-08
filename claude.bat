@echo off
REM --- Launch PowerShell with Claude through proxy ---

powershell -NoExit -ExecutionPolicy Bypass -Command ^
"$env:HTTP_PROXY='http://CHGDBZha:kPQ6NSbt@154.219.202.94:64456'; ^
$env:HTTPS_PROXY='http://CHGDBZha:kPQ6NSbt@154.219.202.94:64456'; ^
do {Clear-Host; Write-Host '=======================================' -ForegroundColor Cyan; ^
Write-Host '   🚀 Claude Code through Proxy' -ForegroundColor Cyan; ^
Write-Host '=======================================' -ForegroundColor Cyan; ^
Write-Host ''; ^
Write-Host '[1] New Session'; ^
Write-Host '[2] Continue Session (--continue)'; ^
Write-Host '[0] Exit'; ^
$choice = Read-Host 'Choose an option'; ^
switch ($choice) { ^
    '1' { claude }; ^
    '2' { claude --continue }; ^
    '0' { break }; ^
    default { Write-Host 'Invalid choice, try again.' } ^
} ^
} while ($true)"
