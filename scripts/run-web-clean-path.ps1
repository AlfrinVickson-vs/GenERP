param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dev", "build", "start")]
  [string]$Command
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$driveLetter = $null

foreach ($candidate in @("B", "A", "R", "Q", "P", "O", "N", "M", "L", "K", "J", "I", "H")) {
  if (-not (Test-Path "$candidate`:\")) {
    $driveLetter = $candidate
    break
  }
}

if (-not $driveLetter) {
  Write-Error "No free drive letter is available for the clean-path Next.js run."
}

$drive = "$driveLetter`:"

try {
  & subst $drive $repoRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to map $drive to $repoRoot"
  }

  Push-Location "$drive\apps\web"
  try {
    & npm run "_$Command"
    exit $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  & subst $drive /D 2>$null
}
