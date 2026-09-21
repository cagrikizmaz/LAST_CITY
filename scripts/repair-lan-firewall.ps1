$ErrorActionPreference = 'Stop'

# Restrict inbound access to this executable, the two game ports and local peers.
$projectRoot = Split-Path -Parent $PSScriptRoot
$running = Get-Process -Name Farming -ErrorAction SilentlyContinue |
    Where-Object { $_.Path } | Select-Object -ExpandProperty Path -Unique
$candidates = @($running) + @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Farming\Farming.exe'),
    (Join-Path $projectRoot 'artifacts\windows\win-unpacked\Farming.exe')
)
$programs = @($candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -Unique)
if ($programs.Count -eq 0) { throw 'Farming.exe bulunamadi. Oyunu acip tekrar deneyin.' }

$index = 0
foreach ($program in $programs) {
    $index++
    foreach ($entry in @(@('TCP', 4765), @('UDP', 4766))) {
        $ruleName = "Farming-LAN-$index-$($entry[0])"
        $existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
        if ($existing) { Remove-NetFirewallRule -Name $ruleName }
        New-NetFirewallRule -Name $ruleName -DisplayName "Farming yerel ag $index ($($entry[0]))" `
            -Direction Inbound -Action Allow -Enabled True -Profile Any `
            -Program $program -Protocol $entry[0] -LocalPort $entry[1] `
            -RemoteAddress LocalSubnet | Out-Null
    }
}
Write-Host 'Farming yerel ag izinleri eklendi. Telefonda Listeyi yenile dugmesine basin.'
Write-Host 'Oda hala gorunmuyorsa kurum/misafir Wi-Fi cihazlar arasi iletisimi engelliyor olabilir.'
