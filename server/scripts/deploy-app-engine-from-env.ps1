param(
  [string]$ProjectId = "healthy-one-gram",
  [string]$EnvFile = "",
  [string]$BackendUrl = "https://healthyonegram-api-v2-xb7znoco6a-uc.a.run.app",
  [string]$ClientUrl = "https://healthyonegram.com",
  [string]$AdminUrl = "https://healthyonegram-admin-studio-8452116634-cdb59.us-central1.hosted.app",
  [string]$CorsOrigins = "https://healthyonegram.com,https://healthyonegram-client-studio-8452116634-cdb59.us-central1.hosted.app,https://healthyonegram-admin-studio-8452116634-cdb59.us-central1.hosted.app",
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-EnvValue {
  param([string]$Value)

  $normalized = [string]$Value
  $normalized = $normalized.Trim()
  if (
    ($normalized.StartsWith('"') -and $normalized.EndsWith('"')) -or
    ($normalized.StartsWith("'") -and $normalized.EndsWith("'"))
  ) {
    $normalized = $normalized.Substring(1, $normalized.Length - 2)
  }

  return $normalized
}

function Read-DotEnvFile {
  param([string]$Path)

  $values = [ordered]@{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      continue
    }

    $key = $matches[1]
    $value = Normalize-EnvValue -Value $matches[2]
    $values[$key] = $value
  }

  return $values
}

function Set-IfMissing {
  param(
    [System.Collections.Specialized.OrderedDictionary]$Values,
    [string]$Target,
    [string[]]$Sources
  )

  if ($Values.Contains($Target) -and -not [string]::IsNullOrWhiteSpace($Values[$Target])) {
    return
  }

  foreach ($source in $Sources) {
    if ($Values.Contains($source) -and -not [string]::IsNullOrWhiteSpace($Values[$source])) {
      $Values[$Target] = $Values[$source]
      return
    }
  }
}

function To-YamlQuotedString {
  param([string]$Value)

  return ConvertTo-Json -Compress -InputObject ([string]$Value)
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  $EnvFile = Join-Path $repoRoot ".env"
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

$envValues = Read-DotEnvFile -Path $EnvFile
Set-IfMissing -Values $envValues -Target "MONGO_URI" -Sources @("MONGODB_URI")
Set-IfMissing -Values $envValues -Target "ACCESS_TOKEN_SECRET" -Sources @("SECRET_KEY_ACCESS_TOKEN", "JSON_WEB_TOKEN_SECRET_KEY")
Set-IfMissing -Values $envValues -Target "REFRESH_TOKEN_SECRET" -Sources @("SECRET_KEY_REFRESH_TOKEN")

$envValues["NODE_ENV"] = "production"
$envValues["SITE_URL"] = $ClientUrl
$envValues["CLIENT_URL"] = $ClientUrl
$envValues["FRONTEND_URL"] = $ClientUrl
$envValues["ADMIN_URL"] = $AdminUrl
$envValues["CORS_ORIGINS"] = $CorsOrigins
$envValues["BACKEND_URL"] = $BackendUrl
$envValues["API_BASE_URL"] = $BackendUrl
$envValues["PAYTM_ORDER_CALLBACK_URL"] = "$BackendUrl/api/orders/webhook/paytm"
$envValues["PHONEPE_ORDER_CALLBACK_URL"] = "$BackendUrl/api/orders/webhook/phonepe"

$required = @(
  "MONGO_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "CLIENT_URL",
  "ADMIN_URL",
  "CORS_ORIGINS"
)

$missing = @(
  foreach ($key in $required) {
    if (-not $envValues.Contains($key) -or [string]::IsNullOrWhiteSpace($envValues[$key])) {
      $key
    }
  }
)

if ($missing.Count -gt 0) {
  throw "Missing required environment values: $($missing -join ', ')"
}

$tempDeployFile = Join-Path $repoRoot "app.deploy.generated.yaml"
$lines = @(
  "runtime: nodejs22",
  "service: default",
  "",
  "automatic_scaling:",
  "  min_instances: 0",
  "  max_instances: 1",
  "  target_cpu_utilization: 0.9",
  "",
  "env_variables:"
)

foreach ($key in ($envValues.Keys | Sort-Object)) {
  $lines += "  ${key}: $(To-YamlQuotedString -Value $envValues[$key])"
}

if ($DryRun) {
  Write-Host "Validated App Engine deploy config for project '$ProjectId' with $($envValues.Count) environment variables."
  return
}

try {
  Set-Content -LiteralPath $tempDeployFile -Value ($lines -join [Environment]::NewLine) -Encoding UTF8

  Push-Location $repoRoot
  try {
    gcloud app deploy $tempDeployFile --project $ProjectId --quiet
    if ($LASTEXITCODE -ne 0) {
      throw "gcloud app deploy failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
} finally {
  if (Test-Path -LiteralPath $tempDeployFile) {
    Remove-Item -LiteralPath $tempDeployFile -Force
  }
}
