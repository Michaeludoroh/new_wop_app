$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3000/api/v1"

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [string]$Token = $null
  )

  $url = "$baseUrl$Path"
  $headers = @{}
  if ($Token) {
    $headers["Authorization"] = "Bearer $Token"
  }

  try {
    if ($null -ne $Body) {
      $jsonBody = $Body | ConvertTo-Json -Depth 20
      $resp = Invoke-RestMethod -Method $Method -Uri $url -Headers $headers -ContentType "application/json" -Body $jsonBody
    } else {
      $resp = Invoke-RestMethod -Method $Method -Uri $url -Headers $headers
    }

    return @{
      ok = $true
      status = 200
      body = $resp
      error = $null
    }
  } catch {
    $statusCode = -1
    $rawBody = ""
    $msg = $_.Exception.Message

    if ($_.Exception.Response -ne $null) {
      try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream -ne $null) {
          $reader = New-Object System.IO.StreamReader($stream)
          $rawBody = $reader.ReadToEnd()
        }
      } catch {}
    }

    return @{
      ok = $false
      status = $statusCode
      body = $rawBody
      error = $msg
    }
  }
}

function Get-TokenForUser {
  param([string]$Email, [string]$Password)
  $login = Invoke-Api -Method "Post" -Path "/auth/login" -Body @{ email = $Email; password = $Password }
  if (-not $login.ok) { return $null }

  if ($login.body.tokens) { return $login.body.tokens.accessToken }
  return $login.body.accessToken
}

$roleUsers = @(
  @{ role = "SUPER_ADMIN"; email = "superadmin@wop.local"; password = "Password123!" },
  @{ role = "ADMIN"; email = "admin@wop.local"; password = "Password123!" },
  @{ role = "MODERATOR"; email = "moderator@wop.local"; password = "Password123!" }
)

$tokens = @{}
foreach ($u in $roleUsers) {
  $tokens[$u.role] = Get-TokenForUser -Email $u.email -Password $u.password
}

$endpoints = @(
  @{ key = "users"; path = "/users"; method = "Get" },
  @{ key = "payments"; path = "/payments"; method = "Get" },
  @{ key = "subscriptions"; path = "/subscriptions/plans"; method = "Get" },
  @{ key = "announcements"; path = "/announcements"; method = "Get" },
  @{ key = "analytics"; path = "/analytics"; method = "Get" },
  @{ key = "notifications"; path = "/notifications"; method = "Get" },
  @{ key = "ebooks"; path = "/ebooks"; method = "Get" },
  @{ key = "mentorship"; path = "/mentorship"; method = "Get" },
  @{ key = "programs"; path = "/programs"; method = "Get" }
)

$matrix = @()

# No token checks
foreach ($ep in $endpoints) {
  $r = Invoke-Api -Method $ep.method -Path $ep.path
  $matrix += [pscustomobject]@{
    role = "UNAUTHENTICATED"
    endpoint = $ep.path
    method = $ep.method
    status = $r.status
    ok = $r.ok
    body = $r.body
  }
}

# Invalid token checks
foreach ($ep in $endpoints) {
  $r = Invoke-Api -Method $ep.method -Path $ep.path -Token "invalid.token.value"
  $matrix += [pscustomobject]@{
    role = "INVALID_TOKEN"
    endpoint = $ep.path
    method = $ep.method
    status = $r.status
    ok = $r.ok
    body = $r.body
  }
}

# Role token checks
foreach ($role in @("SUPER_ADMIN","ADMIN","MODERATOR")) {
  $token = $tokens[$role]
  foreach ($ep in $endpoints) {
    $r = Invoke-Api -Method $ep.method -Path $ep.path -Token $token
    $matrix += [pscustomobject]@{
      role = $role
      endpoint = $ep.path
      method = $ep.method
      status = $r.status
      ok = $r.ok
      body = $r.body
    }
  }
}

$matrix | ConvertTo-Json -Depth 20

