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
    }
  } catch {
    $statusCode = -1
    $rawBody = ""
    if ($_.Exception.Response -ne $null) {
      try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $rawBody = $reader.ReadToEnd()
      } catch {}
    }

    return @{
      ok = $false
      status = $statusCode
      body = $rawBody
    }
  }
}

function Get-AccessToken {
  param([string]$Email, [string]$Password)
  $login = Invoke-Api -Method "Post" -Path "/auth/login" -Body @{ email = $Email; password = $Password }
  if (-not $login.ok) { return $null }
  if ($login.body.tokens) { return $login.body.tokens.accessToken }
  return $login.body.accessToken
}

$tokens = @{
  SUPER_ADMIN = Get-AccessToken -Email "superadmin@wop.local" -Password "Password123!"
  ADMIN = Get-AccessToken -Email "admin@wop.local" -Password "Password123!"
  MODERATOR = Get-AccessToken -Email "moderator@wop.local" -Password "Password123!"
}

$tests = @(
  @{ name = "POST /payments valid"; method = "Post"; path = "/payments"; body = @{ amount = 100; currency = "USD" } },
  @{ name = "POST /payments missing fields"; method = "Post"; path = "/payments"; body = @{} },
  @{ name = "POST /subscriptions valid"; method = "Post"; path = "/subscriptions"; body = @{ planCode = "MONTHLY" } },
  @{ name = "PATCH /subscriptions/:id/cancel"; method = "Patch"; path = "/subscriptions/bad-id/cancel"; body = @{} },
  @{ name = "POST /announcements valid"; method = "Post"; path = "/announcements"; body = @{ title = "QA"; content = "Body" } },
  @{ name = "POST /announcements missing fields"; method = "Post"; path = "/announcements"; body = @{} },
  @{ name = "POST /programs valid"; method = "Post"; path = "/programs"; body = @{ title = "Program QA" } },
  @{ name = "POST /mentorship valid"; method = "Post"; path = "/mentorship"; body = @{ title = "Mentor QA" } },
  @{ name = "POST /notifications valid"; method = "Post"; path = "/notifications"; body = @{ title = "Notif QA"; message = "Hello" } },
  @{ name = "PATCH /users/:id/profile"; method = "Patch"; path = "/users/bad-id/profile"; body = @{ fullName = "X" } },
  @{ name = "DELETE /announcements/:id"; method = "Delete"; path = "/announcements/bad-id"; body = $null }
)

$results = @()

foreach ($test in $tests) {
  $unauth = Invoke-Api -Method $test.method -Path $test.path -Body $test.body
  $results += [pscustomobject]@{
    role = "UNAUTHENTICATED"
    test = $test.name
    method = $test.method
    endpoint = $test.path
    status = $unauth.status
    ok = $unauth.ok
    body = $unauth.body
  }

  foreach ($role in @("SUPER_ADMIN", "ADMIN", "MODERATOR")) {
    $res = Invoke-Api -Method $test.method -Path $test.path -Body $test.body -Token $tokens[$role]
    $results += [pscustomobject]@{
      role = $role
      test = $test.name
      method = $test.method
      endpoint = $test.path
      status = $res.status
      ok = $res.ok
      body = $res.body
    }
  }
}

$results | ConvertTo-Json -Depth 20

