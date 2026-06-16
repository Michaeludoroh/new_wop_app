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
    $message = $_.Exception.Message
    $rawBody = $null

    if ($_.Exception.Response -ne $null) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
      } catch {}

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
      message = $message
      body = $rawBody
    }
  }
}

$results = @()

# invalid credentials test
$invalidLogin = Invoke-Api -Method "Post" -Path "/auth/login" -Body @{
  email = "invalid@test.com"
  password = "wrongpass123"
}
$results += [pscustomobject]@{
  test = "Invalid login"
  status = $invalidLogin.status
  ok = $invalidLogin.ok
  response = $invalidLogin.body
}

# role users to test (replace passwords if needed)
$roleUsers = @(
  @{ role = "SUPER_ADMIN"; email = "superadmin@wop.local"; password = "Password123!" },
  @{ role = "ADMIN"; email = "admin@wop.local"; password = "Password123!" },
  @{ role = "MODERATOR"; email = "moderator@wop.local"; password = "Password123!" }
)

$sessionByRole = @{}

foreach ($user in $roleUsers) {
  $login = Invoke-Api -Method "Post" -Path "/auth/login" -Body @{
    email = $user.email
    password = $user.password
  }

  $accessToken = $null
  $refreshToken = $null
  if ($login.ok -and $null -ne $login.body) {
    if ($login.body.tokens) {
      $accessToken = $login.body.tokens.accessToken
      $refreshToken = $login.body.tokens.refreshToken
    } else {
      $accessToken = $login.body.accessToken
      $refreshToken = $login.body.refreshToken
    }
  }

  $sessionByRole[$user.role] = @{
    login = $login
    accessToken = $accessToken
    refreshToken = $refreshToken
  }

  $results += [pscustomobject]@{
    test = "$($user.role) login"
    status = $login.status
    ok = $login.ok
    response = $login.body
  }

  if ($accessToken) {
    $me = Invoke-Api -Method "Get" -Path "/auth/me" -Token $accessToken
    $results += [pscustomobject]@{
      test = "$($user.role) /auth/me"
      status = $me.status
      ok = $me.ok
      response = $me.body
    }
  }

  if ($refreshToken) {
    $refresh = Invoke-Api -Method "Post" -Path "/auth/refresh" -Body @{ refreshToken = $refreshToken }
    $results += [pscustomobject]@{
      test = "$($user.role) /auth/refresh"
      status = $refresh.status
      ok = $refresh.ok
      response = $refresh.body
    }
  }

  if ($refreshToken) {
    $logout = Invoke-Api -Method "Post" -Path "/auth/logout" -Body @{ refreshToken = $refreshToken }
    $results += [pscustomobject]@{
      test = "$($user.role) /auth/logout"
      status = $logout.status
      ok = $logout.ok
      response = $logout.body
    }
  }
}

# invalid token auth/me
$badMe = Invoke-Api -Method "Get" -Path "/auth/me" -Token "invalid.token.value"
$results += [pscustomobject]@{
  test = "Invalid token /auth/me"
  status = $badMe.status
  ok = $badMe.ok
  response = $badMe.body
}

$results | ConvertTo-Json -Depth 20

