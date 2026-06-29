<#
.SYNOPSIS
  Smoke test profundo para Corazon Migrante Backend, compatible con Windows PowerShell.

.DESCRIPTION
  Valida salud de API/DB/Redis, autenticacion, refresh/logout, RBAC, catalogo publico/admin,
  CMS, agenda/disponibilidad, citas, archivos/GCS o local, contabilidad, auditoria, analytics y outbox.

.USAGE
  # En terminal 1:
  yarn start:dev

  # En terminal 2, smoke de solo lectura:
  yarn smoke:deep:win

  # Smoke profundo con escrituras controladas:
  yarn smoke:deep:win -- -AllowMutations

  # Procesar outbox real; cuidado si EMAIL_PROVIDER/MAIL_PROVIDER=SENDGRID:
  yarn smoke:deep:win -- -AllowMutations -ProcessOutbox
#>

param(
  [string]$BaseUrl,
  [string]$EnvPath = ".env",
  [switch]$AllowMutations,
  [switch]$ProcessOutbox,
  [switch]$SkipFileUpload,
  [switch]$VerboseBody
)

$ErrorActionPreference = "Stop"
$script:Passed = 0
$script:Failed = 0
$script:Warnings = 0
$script:Tokens = @{}
$script:Users = @{}
$script:Prefix = "smoke-" + (Get-Date -Format "yyyyMMddHHmmss")

function Write-Ok($message) { Write-Host "[OK] $message" -ForegroundColor Green }
function Write-WarnLine($message) { $script:Warnings++; Write-Host "[WARN] $message" -ForegroundColor Yellow }
function Write-FailLine($message) { Write-Host "[FAIL] $message" -ForegroundColor Red }
function Write-Info($message) { Write-Host "[INFO] $message" -ForegroundColor Cyan }

function Load-DotEnv([string]$Path) {
  if (-not (Test-Path $Path)) {
    Write-WarnLine "No se encontro $Path. Se usara el entorno actual."
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -le 0) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
  }
}

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

function Invoke-Step([string]$Name, [scriptblock]$Action) {
  Write-Host "`n[STEP] $Name" -ForegroundColor White
  try {
    & $Action
    $script:Passed++
    Write-Ok $Name
  } catch {
    $script:Failed++
    Write-FailLine $Name
    Write-Host $_.Exception.Message -ForegroundColor Red
    throw
  }
}

function New-SmokeHeaders([string]$Token) {
  $headers = @{
    'X-Smoke-Test' = 'corazon-migrante-deep-smoke'
    'X-Request-Id' = [guid]::NewGuid().ToString()
  }
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  return $headers
}

function ConvertTo-ApiJson($Body) {
  if ($null -eq $Body) { return $null }
  return ($Body | ConvertTo-Json -Depth 30 -Compress)
}

function Read-ErrorResponseBody($Response) {
  if ($null -eq $Response) { return '' }
  try {
    $stream = $Response.GetResponseStream()
    if ($null -eq $stream) { return '' }
    $reader = New-Object System.IO.StreamReader($stream)
    return $reader.ReadToEnd()
  } catch {
    return ''
  }
}

function Invoke-Api {
  param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Path,
    $Body = $null,
    [string]$Token = $null,
    [int[]]$Expected = @(200)
  )

  $uri = "$script:BaseUrl$Path"
  $headers = New-SmokeHeaders $Token
  $json = ConvertTo-ApiJson $Body

  try {
    if ($null -ne $json) {
      $res = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -ContentType 'application/json' -Body $json -UseBasicParsing
    } else {
      $res = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -UseBasicParsing
    }
    $status = [int]$res.StatusCode
    $raw = [string]$res.Content
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      $raw = Read-ErrorResponseBody $_.Exception.Response
    } else {
      throw
    }
  }

  if ($Expected -notcontains $status) {
    $msg = "HTTP inesperado $status en $Method $Path. Esperado: $($Expected -join ', '). Body: $raw"
    throw $msg
  }

  $obj = $null
  if ($raw) {
    try { $obj = $raw | ConvertFrom-Json } catch { $obj = $raw }
  }
  if ($VerboseBody) {
    Write-Host "HTTP $status $Method $Path" -ForegroundColor DarkGray
    Write-Host $raw -ForegroundColor DarkGray
  }
  return [pscustomobject]@{ Status = $status; Body = $obj; Raw = $raw }
}

function Invoke-UploadFile {
  param(
    [string]$Path,
    [string]$Token,
    [string]$FilePath,
    [string]$Module = 'USER_PROFILE',
    [string]$Visibility = 'PRIVATE'
  )
  $uri = "$script:BaseUrl$Path"
  $headers = New-SmokeHeaders $Token

  $client = New-Object System.Net.Http.HttpClient
  foreach ($key in $headers.Keys) {
    if ($key -ne 'Authorization') { $client.DefaultRequestHeaders.Add($key, $headers[$key]) }
  }
  if ($headers.ContainsKey('Authorization')) {
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $Token)
  }

  $form = New-Object System.Net.Http.MultipartFormDataContent
  $form.Add((New-Object System.Net.Http.StringContent($Module)), 'module')
  $form.Add((New-Object System.Net.Http.StringContent($Visibility)), 'visibility')

  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $fileContent = New-Object System.Net.Http.ByteArrayContent(,$bytes)
  $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/pdf')
  $form.Add($fileContent, 'file', [System.IO.Path]::GetFileName($FilePath))

  $response = $client.PostAsync($uri, $form).Result
  $raw = $response.Content.ReadAsStringAsync().Result
  $status = [int]$response.StatusCode
  $client.Dispose()

  if ($status -lt 200 -or $status -gt 299) {
    throw "HTTP inesperado $status en multipart upload. Body: $raw"
  }
  return [pscustomobject]@{ Status = $status; Body = ($raw | ConvertFrom-Json); Raw = $raw }
}

function Login-As([string]$Alias, [string]$Email, [string]$Password) {
  $res = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = $Email; password = $Password } -Expected @(200,201)
  $data = $res.Body.data
  Assert-True ($null -ne $data.accessToken) "Login $Alias no devolvio accessToken."
  Assert-True ($null -ne $data.refreshToken) "Login $Alias no devolvio refreshToken."
  $script:Tokens[$Alias] = $data.accessToken
  $script:Tokens["$Alias.refresh"] = $data.refreshToken
  $script:Users[$Alias] = $data.user
  Write-Info "$Alias autenticado: $($data.user.email) [$($data.user.roles -join ',')]"
}

function First-Item($Collection, [string]$Name) {
  if ($null -eq $Collection -or $Collection.Count -lt 1) { throw "No hay datos para $Name. Revisa seeds/migraciones." }
  return $Collection[0]
}

Load-DotEnv $EnvPath

if (-not $BaseUrl) {
  $port = if ($env:PORT) { $env:PORT } else { '3000' }
  $apiPrefix = if ($env:API_PREFIX) { $env:API_PREFIX.Trim('/') } else { 'api/v1' }
  $BaseUrl = "http://localhost:$port/$apiPrefix"
}
$script:BaseUrl = $BaseUrl.TrimEnd('/')

Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "Corazon Migrante - Smoke profundo" -ForegroundColor Magenta
Write-Host "BaseUrl: $script:BaseUrl" -ForegroundColor Magenta
Write-Host "Mutaciones: $AllowMutations | File upload: $(-not $SkipFileUpload) | Process outbox: $ProcessOutbox" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

Invoke-Step 'Preflight de variables criticas' {
  Assert-True ($env:JWT_ACCESS_SECRET -and $env:JWT_ACCESS_SECRET.Length -ge 32) 'JWT_ACCESS_SECRET ausente o corto.'
  Assert-True ($env:JWT_REFRESH_SECRET -and $env:JWT_REFRESH_SECRET.Length -ge 32) 'JWT_REFRESH_SECRET ausente o corto.'
  if ($env:JWT_REFRESH_SECRET -match 'JWT_ACCESS_EXPIRES_IN') {
    throw 'Tu .env tiene JWT_REFRESH_SECRET pegado con JWT_ACCESS_EXPIRES_IN. Debes poner JWT_ACCESS_EXPIRES_IN=15m en una linea separada.'
  }
  if (-not $env:JWT_ACCESS_EXPIRES_IN) { Write-WarnLine 'JWT_ACCESS_EXPIRES_IN no esta definido; el backend usara 15m por defecto.' }
  if ($env:STORAGE_PROVIDER -eq 'GCS') {
    Assert-True (($env:GCS_BUCKET) -or ($env:GCS_BUCKET_NAME_USER_MEDIA)) 'STORAGE_PROVIDER=GCS requiere GCS_BUCKET o GCS_BUCKET_NAME_USER_MEDIA.'
    if (-not $env:GOOGLE_APPLICATION_CREDENTIALS -and -not $env:GOOGLE_CREDENTIALS_JSON -and -not $env:GOOGLE_CREDENTIALS_BASE64) {
      Write-WarnLine 'GCS activo sin credenciales explicitas; solo funcionara si el runtime tiene Service Account asignada.'
    }
  }
  $provider = if ($env:EMAIL_PROVIDER) { $env:EMAIL_PROVIDER } elseif ($env:MAIL_PROVIDER) { $env:MAIL_PROVIDER } else { 'DEV_NULL' }
  if ($provider -eq 'SENDGRID') {
    if (-not $env:SENDGRID_API_KEY) { throw 'SENDGRID activo pero SENDGRID_API_KEY no esta definido.' }
    if ($env:SENDGRID_API_KEY -notmatch '^SG\.') { Write-WarnLine 'SENDGRID_API_KEY no parece tener formato real de SendGrid. Si procesas outbox, probablemente fallara.' }
    if (-not $ProcessOutbox) { Write-WarnLine 'SendGrid esta activo, pero no se procesara outbox porque no usaste -ProcessOutbox.' }
  }
  if ($env:REDIS_URL -and -not $env:REDIS_HOST) { Write-WarnLine 'Estas usando REDIS_URL. Esta version hotfix lo soporta; versiones anteriores esperaban REDIS_HOST/REDIS_PORT.' }
}

Invoke-Step 'Health profundo: API + DB + Redis' {
  $res = Invoke-Api -Method GET -Path '/health'
  Assert-True ($res.Body.data.status -eq 'ok') 'Health status no es ok.'
  Assert-True ($res.Body.data.database -eq 'ok') 'Database no responde ok.'
  Assert-True ($res.Body.data.redis -eq 'ok') 'Redis no responde ok. Levanta Redis o corrige REDIS_HOST/REDIS_URL.'
}

Invoke-Step 'Publico: catalogo, CMS, booking availability tolerante' {
  $approaches = Invoke-Api -Method GET -Path '/therapy/approaches?page=1&limit=10'
  Assert-True ($approaches.Body.data.Count -ge 1) 'No hay enfoques publicos.'
  $products = Invoke-Api -Method GET -Path '/therapy/products?page=1&limit=10'
  Assert-True ($products.Body.data.Count -ge 1) 'No hay productos publicos.'
  $page = Invoke-Api -Method GET -Path '/public/pages/inicio'
  Assert-True ($page.Body.data.slug -eq 'inicio') 'CMS inicio no responde.'
  Invoke-Api -Method GET -Path '/legacy/status' | Out-Null
}

Invoke-Step 'Seguridad negativa: /me sin token debe rechazar' {
  Invoke-Api -Method GET -Path '/me' -Expected @(401) | Out-Null
}

Invoke-Step 'Seguridad negativa: login invalido debe rechazar' {
  Invoke-Api -Method POST -Path '/auth/login' -Body @{ email='paciente.demo@corazonmigrante.test'; password='ClaveIncorrecta123!' } -Expected @(401) | Out-Null
}

Invoke-Step 'Login de todos los roles demo y /me' {
  Login-As 'superadmin' 'superadmin@corazonmigrante.test' 'Demo123456!'
  Login-As 'admin' 'admin@corazonmigrante.test' 'Demo123456!'
  Login-As 'accountant' 'contador@corazonmigrante.test' 'Demo123456!'
  Login-As 'therapist' 'terapeuta.demo@corazonmigrante.test' 'Demo123456!'
  Login-As 'patient' 'paciente.demo@corazonmigrante.test' 'Demo123456!'

  foreach ($alias in @('admin','accountant','therapist','patient')) {
    $me = Invoke-Api -Method GET -Path '/me' -Token $script:Tokens[$alias]
    Assert-True ($me.Body.data.email) "/me no devolvio email para $alias."
  }
}

Invoke-Step 'Refresh token, logout y revocacion real' {
  $refresh = $script:Tokens['patient.refresh']
  $newPair = Invoke-Api -Method POST -Path '/auth/refresh' -Body @{ refreshToken = $refresh } -Expected @(200,201)
  Assert-True ($newPair.Body.data.accessToken) 'Refresh no devolvio accessToken.'
  $newRefresh = $newPair.Body.data.refreshToken
  Invoke-Api -Method POST -Path '/auth/refresh' -Body @{ refreshToken = $refresh } -Expected @(401) | Out-Null
  Invoke-Api -Method POST -Path '/auth/logout' -Body @{ refreshToken = $newRefresh } -Expected @(200,201) | Out-Null
  Invoke-Api -Method POST -Path '/auth/refresh' -Body @{ refreshToken = $newRefresh } -Expected @(401) | Out-Null
}

Invoke-Step 'RBAC negativo: paciente no puede ver admin/users' {
  Invoke-Api -Method GET -Path '/admin/users' -Token $script:Tokens['patient'] -Expected @(403) | Out-Null
}

Invoke-Step 'RBAC negativo: contador no puede administrar terapia' {
  Invoke-Api -Method GET -Path '/admin/therapy/products' -Token $script:Tokens['accountant'] -Expected @(403) | Out-Null
}

Invoke-Step 'RBAC positivo: admin, contador y terapeuta en sus modulos' {
  Invoke-Api -Method GET -Path '/admin/users?page=1&limit=10' -Token $script:Tokens['admin'] | Out-Null
  Invoke-Api -Method GET -Path '/admin/accounting/accounts?page=1&limit=10' -Token $script:Tokens['accountant'] | Out-Null
  Invoke-Api -Method GET -Path '/therapists/me/schedules' -Token $script:Tokens['therapist'] | Out-Null
}

Invoke-Step 'Analytics publico + lectura admin' {
  Invoke-Api -Method POST -Path '/analytics/ui-events' -Body @{ sessionId=$script:Prefix; eventName='SMOKE_DEEP_VISIT'; payload=@{ source='powershell'; mode='deep' } } -Expected @(200,201) | Out-Null
  $events = Invoke-Api -Method GET -Path '/admin/analytics/ui-events?page=1&limit=5' -Token $script:Tokens['admin']
  Assert-True ($events.Body.data.Count -ge 1) 'No se listan eventos analytics.'
}

Invoke-Step 'Auditoria y outbox visibles para admin' {
  $audit = Invoke-Api -Method GET -Path '/admin/audit/logs?page=1&limit=10' -Token $script:Tokens['admin']
  Assert-True ($audit.Body.data.Count -ge 1) 'No hay logs de auditoria.'
  Invoke-Api -Method GET -Path '/admin/messaging/outbox?page=1&limit=10' -Token $script:Tokens['admin'] | Out-Null
}

if ($AllowMutations) {
  Invoke-Step 'Mutacion Auth: registro paciente nuevo + duplicado protegido' {
    $email = "$script:Prefix-patient@smoke.test"
    $created = Invoke-Api -Method POST -Path '/auth/register/patient' -Body @{
      email=$email; password='Demo123456!'; firstName='Smoke'; lastName='Paciente'; phone='+59170000000'; country='Bolivia'; city='Santa Cruz'; occupation='QA'
    } -Expected @(200,201)
    Assert-True ($created.Body.data.email -eq $email) 'Paciente nuevo no fue creado.'
    Invoke-Api -Method POST -Path '/auth/register/patient' -Body @{
      email=$email; password='Demo123456!'; firstName='Smoke'; lastName='Paciente'
    } -Expected @(400) | Out-Null
  }

  Invoke-Step 'Mutacion perfil paciente con auditoria' {
    $res = Invoke-Api -Method PATCH -Path '/me/patient-profile' -Token $script:Tokens['patient'] -Body @{ city="Smoke City $script:Prefix" }
    Assert-True ($res.Body.data.city -like 'Smoke City*') 'No actualizo perfil paciente.'
  }

  Invoke-Step 'Admin terapia: crear enfoque, producto, patch y soft delete' {
    $approach = Invoke-Api -Method POST -Path '/admin/therapy/approaches' -Token $script:Tokens['admin'] -Body @{
      name="Smoke enfoque $script:Prefix"; description='Creado por smoke profundo'; status='ACTIVE'; sortOrder=99
    } -Expected @(200,201)
    $approachId = $approach.Body.data.id
    Assert-True $approachId 'No se creo enfoque.'

    $product = Invoke-Api -Method POST -Path '/admin/therapy/products' -Token $script:Tokens['admin'] -Body @{
      approachId=$approachId; name="Smoke producto $script:Prefix"; description='Producto temporal'; durationMinutes=60; price=123; currency='BOB'; status='ACTIVE'; sortOrder=99
    } -Expected @(200,201)
    $productId = $product.Body.data.id
    Assert-True $productId 'No se creo producto.'

    Invoke-Api -Method PATCH -Path "/admin/therapy/products/$productId" -Token $script:Tokens['admin'] -Body @{
      approachId=$approachId; name="Smoke producto actualizado $script:Prefix"; description='Actualizado'; durationMinutes=60; price=124; currency='BOB'; status='ACTIVE'; sortOrder=98
    } | Out-Null
    Invoke-Api -Method DELETE -Path "/admin/therapy/products/$productId" -Token $script:Tokens['admin'] | Out-Null
  }

  Invoke-Step 'CMS admin: crear pagina publicada + elemento + lectura publica' {
    $slug = "smoke-$script:Prefix"
    $page = Invoke-Api -Method POST -Path '/admin/cms/pages' -Token $script:Tokens['admin'] -Body @{
      slug=$slug; title="Smoke page $script:Prefix"; status='PUBLISHED'; seoMetadata=@{ description='Smoke profundo' }
    } -Expected @(200,201)
    $pageId = $page.Body.data.id
    Assert-True $pageId 'No se creo pagina CMS.'

    Invoke-Api -Method POST -Path "/admin/cms/pages/$pageId/elements" -Token $script:Tokens['admin'] -Body @{
      code='hero'; type='HERO'; content=@{ title='Smoke'; subtitle='Validacion profunda' }; sortOrder=1
    } -Expected @(200,201) | Out-Null
    $public = Invoke-Api -Method GET -Path "/public/pages/$slug"
    Assert-True ($public.Body.data.slug -eq $slug) 'La pagina CMS creada no se lee publicamente.'
  }

  Invoke-Step 'Agenda y booking: disponibilidad + cita + transicion de estado' {
    $products = Invoke-Api -Method GET -Path '/therapy/products?page=1&limit=10'
    $product = First-Item $products.Body.data 'productos'
    $therapistId = $script:Users['therapist'].id
    $availabilityPath = '/booking/availability?therapistUserId=' + [System.Uri]::EscapeDataString([string]$therapistId) + '&productId=' + [System.Uri]::EscapeDataString([string]$product.id) + '&from=2026-07-01&to=2026-07-07&timezone=America%2FLa_Paz' 
    $availability = Invoke-Api -Method GET -Path $availabilityPath
    Assert-True ($availability.Body.data.slots.Count -ge 1) 'No hay slots disponibles para cita.'
    $slot = $availability.Body.data.slots[0]

    $appointment = Invoke-Api -Method POST -Path '/appointments' -Token $script:Tokens['patient'] -Body @{
      therapistUserId=$therapistId; productId=$product.id; scheduledStartAt=$slot.startAt; timezone='America/La_Paz'; notesForTherapist='Smoke profundo'
    } -Expected @(200,201)
    $appointmentId = $appointment.Body.data.id
    Assert-True $appointmentId 'No se creo cita.'

    Invoke-Api -Method PATCH -Path "/appointments/$appointmentId/status" -Token $script:Tokens['therapist'] -Body @{ status='CONFIRMED'; reason='Smoke confirma cita' } | Out-Null
    Invoke-Api -Method PATCH -Path "/appointments/$appointmentId/status" -Token $script:Tokens['patient'] -Body @{ status='COMPLETED'; reason='Transicion invalida esperada' } -Expected @(400) | Out-Null
    Invoke-Api -Method GET -Path '/appointments/mine?page=1&limit=10' -Token $script:Tokens['patient'] | Out-Null
    Invoke-Api -Method GET -Path '/appointments/admin/list?page=1&limit=10' -Token $script:Tokens['admin'] | Out-Null
  }

  Invoke-Step 'Contabilidad: transaccion balanceada y rollback logico de desbalanceada' {
    $groups = Invoke-Api -Method GET -Path '/admin/accounting/account-groups?page=1&limit=10' -Token $script:Tokens['accountant']
    $accounts = Invoke-Api -Method GET -Path '/admin/accounting/accounts?page=1&limit=10' -Token $script:Tokens['accountant']
    Assert-True ($accounts.Body.data.Count -ge 2) 'Se requieren al menos dos cuentas para probar contabilidad.'
    $a1 = $accounts.Body.data[0]
    $a2 = $accounts.Body.data[1]

    Invoke-Api -Method POST -Path '/admin/accounting/transactions' -Token $script:Tokens['accountant'] -Body @{
      date='2026-07-01'; description="Smoke balanced $script:Prefix"; reference=$script:Prefix;
      entries=@(
        @{ accountId=$a1.id; debit=10; credit=0 },
        @{ accountId=$a2.id; debit=0; credit=10 }
      )
    } -Expected @(200,201) | Out-Null

    Invoke-Api -Method POST -Path '/admin/accounting/transactions' -Token $script:Tokens['accountant'] -Body @{
      date='2026-07-01'; description="Smoke unbalanced rollback $script:Prefix"; reference="$script:Prefix-unbalanced";
      entries=@(
        @{ accountId=$a1.id; debit=10; credit=0 },
        @{ accountId=$a2.id; debit=0; credit=9 }
      )
    } -Expected @(400) | Out-Null
  }

  if (-not $SkipFileUpload) {
    Invoke-Step 'Archivos: upload + metadata + signed-url, local o GCS' {
      $tmpDir = Join-Path (Get-Location) 'storage/tmp'
      if (-not (Test-Path $tmpDir)) { New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null }
      $filePath = Join-Path $tmpDir "$script:Prefix.pdf"
      [System.IO.File]::WriteAllBytes($filePath, [byte[]](37,80,68,70,45,49,46,52,10,37,226,227,207,211,10,49,32,48,32,111,98,106,10,60,60,62,62,10,101,110,100,111,98,106,10,116,114,97,105,108,101,114,10,60,60,62,62,10,37,37,69,79,70))
      $upload = Invoke-UploadFile -Path '/files' -Token $script:Tokens['patient'] -FilePath $filePath -Module 'USER_PROFILE' -Visibility 'PRIVATE'
      $fileId = $upload.Body.data.id
      Assert-True $fileId 'Upload no devolvio fileId.'
      $signed = Invoke-Api -Method GET -Path "/files/$fileId/signed-url" -Token $script:Tokens['patient']
      Assert-True ($signed.Body.data.url) 'No se obtuvo signed URL.'
    }
  }

  if ($ProcessOutbox) {
    Invoke-Step 'Outbox: procesamiento real de mensajes pendientes' {
      $processed = Invoke-Api -Method POST -Path '/admin/messaging/outbox/process' -Token $script:Tokens['admin'] -Expected @(200,201)
      Assert-True ($processed.Body.data.processed -ge 0) 'Outbox process no devolvio processed.'
      Write-WarnLine 'Si SendGrid esta activo, revisa message_send_logs y reputacion de remitente/dominio.'
    }
  } else {
    Write-WarnLine 'Saltando procesamiento outbox. Usa -ProcessOutbox solo si quieres enviar/validar SendGrid real.'
  }
} else {
  Write-WarnLine 'Modo seguro de solo lectura. Para pruebas profundas con escrituras usa: yarn smoke:deep:win -- -AllowMutations'
}

Write-Host "`n============================================================" -ForegroundColor Magenta
Write-Host "Resultado smoke profundo" -ForegroundColor Magenta
Write-Host "Pasos OK: $script:Passed" -ForegroundColor Green
Write-Host "Advertencias: $script:Warnings" -ForegroundColor Yellow
Write-Host "Fallos: $script:Failed" -ForegroundColor $(if ($script:Failed -eq 0) { 'Green' } else { 'Red' })
Write-Host "============================================================" -ForegroundColor Magenta

if ($script:Failed -gt 0) { exit 1 }
exit 0
