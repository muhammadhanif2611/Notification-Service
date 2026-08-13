# Debug script: cek apakah user admin ada, lalu coba login via gateway.
# Jalankan: powershell -NoProfile -File scripts\debug-login.ps1

$ErrorActionPreference = 'Stop'

function Invoke-Api {
    param([string]$Method, [string]$Url, [string]$Body)
    try {
        $params = @{ Uri = $Url; Method = $Method; ContentType = 'application/json' }
        if ($Body) { $params.Body = $Body }
        $resp = Invoke-WebRequest @params -UseBasicParsing
        Write-Host "[$Method $Url] -> $($resp.StatusCode)"
        Write-Host $resp.Content
    } catch {
        $status = $null
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        Write-Host "[$Method $Url] -> ERROR $status"
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Host $reader.ReadToEnd()
        } else {
            Write-Host $_.Exception.Message
        }
    }
    Write-Host ('-' * 60)
}

# 1. Apakah ada user di DB? (endpoint internal auth-service, tanpa auth)
Invoke-Api -Method Get -Url 'http://127.0.0.1:3002/auth/users'

# 2. Coba login dengan kredensial admin yang direncanakan
Invoke-Api -Method Post -Url 'http://127.0.0.1:3001/v1/auth/login' -Body '{"email":"admin@notification.id","password":"admin12345"}'

# 3. Tebakan password umum untuk akun seed admin@notification.com
$guesses = @('admin123', 'admin1234', 'admin12345', 'password', 'password123', 'admin', 'qwerty123', 'notif123', 'dev12345')
foreach ($g in $guesses) {
    try {
        $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/v1/auth/login' -Method Post -ContentType 'application/json' -Body (@{ email = 'admin@notification.com'; password = $g } | ConvertTo-Json) -UseBasicParsing
        Write-Host "PASSWORD ADMIN DITEMUKAN: '$g'"
        Write-Host $resp.Content
        exit 0
    } catch {
        Write-Host "gagal: '$g'"
    }
}
Write-Host 'Tidak ada tebakan yang cocok.'

# 4. Tebakan untuk akun developer user
foreach ($g in @('user123', 'user12345', 'dev12345', 'developer123', 'password123')) {
    try {
        $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/v1/auth/login' -Method Post -ContentType 'application/json' -Body (@{ email = 'user@notification.com'; password = $g } | ConvertTo-Json) -UseBasicParsing
        Write-Host "PASSWORD USER DITEMUKAN: '$g'"
        exit 0
    } catch {
        Write-Host "gagal (user): '$g'"
    }
}
