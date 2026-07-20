$ErrorActionPreference = "Stop"

$schemaPath = Join-Path $PSScriptRoot "..\apps\api\prisma\schema.prisma"
$localSchemaPath = Join-Path $PSScriptRoot "..\apps\api\prisma\schema.local.sqlite.prisma"

$schema = Get-Content -Raw -LiteralPath $schemaPath
$schema = $schema -replace 'provider = "postgresql"', 'provider = "sqlite"'
$schema = $schema -replace 'url      = env\("DATABASE_URL"\)', 'url      = env("SQLITE_DATABASE_URL")'
$schema = $schema -replace ' @db\.Decimal\([0-9]+, [0-9]+\)', ''
$schema = $schema -replace '(?s)enum UserStatus \{.*?\}\s+', ''
$schema = $schema -replace '(?s)enum LoginResult \{.*?\}\s+', ''
$schema = $schema -replace 'status                UserStatus     @default\(INVITED\)', 'status                String         @default("INVITED")'
$schema = $schema -replace 'result    LoginResult', 'result    String'
$schema = $schema -replace 'recoveryCodesHash     Json\?', 'recoveryCodesHash     String?'
$schema = $schema -replace 'beforeValue   Json\?', 'beforeValue   String?'
$schema = $schema -replace 'afterValue    Json\?', 'afterValue    String?'
$schema = $schema -replace 'minAmount    Decimal\?', 'minAmount    String?'
$schema = $schema -replace 'maxAmount    Decimal\?', 'maxAmount    String?'

[System.IO.File]::WriteAllText($localSchemaPath, $schema, [System.Text.UTF8Encoding]::new($false))
Write-Host "Prepared $localSchemaPath"
