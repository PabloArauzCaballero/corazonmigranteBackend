#!/usr/bin/env bash
set -Eeuo pipefail

# Smoke profundo clasico Bash para Corazon Migrante Backend.
# Requiere: bash, curl, jq.
# Uso:
#   yarn smoke:deep
#   yarn smoke:deep -- --mutations
#   BASE_URL=http://localhost:3003/api/v1 yarn smoke:deep -- --mutations --external

ALLOW_MUTATIONS=false
PROCESS_OUTBOX=false
RUN_BACKUP_DRY_RUN=false
SKIP_FILE_UPLOAD=false
EXTERNAL=false
VERBOSE=false

for arg in "$@"; do
  case "$arg" in
    --mutations|--allow-mutations) ALLOW_MUTATIONS=true ;;
    --process-outbox) PROCESS_OUTBOX=true ;;
    --backup-dry-run) RUN_BACKUP_DRY_RUN=true ;;
    --skip-file-upload) SKIP_FILE_UPLOAD=true ;;
    --external) EXTERNAL=true ;;
    --verbose) VERBOSE=true ;;
    *) echo "Argumento no reconocido: $arg"; exit 2 ;;
  esac
done

command -v curl >/dev/null || { echo "FALTA: curl"; exit 1; }
command -v jq >/dev/null || { echo "FALTA: jq"; exit 1; }
command -v base64 >/dev/null || { echo "FALTA: base64"; exit 1; }

read_env_value() {
  local key="$1"
  if [[ -f .env ]]; then
    grep -E "^${key}=" .env | tail -n 1 | cut -d '=' -f2- | tr -d '\r' || true
  fi
}

if [[ -z "${BASE_URL:-}" ]]; then
  PORT_FROM_ENV="$(read_env_value PORT)"
  API_PREFIX_FROM_ENV="$(read_env_value API_PREFIX)"
  PORT_FROM_ENV="${PORT_FROM_ENV:-3000}"
  API_PREFIX_FROM_ENV="${API_PREFIX_FROM_ENV:-api/v1}"
  BASE_URL="http://localhost:${PORT_FROM_ENV}/${API_PREFIX_FROM_ENV}"
fi

BASE_URL="${BASE_URL%/}"
PASSWORD="${SMOKE_PASSWORD:-Demo123456!}"
PATIENT_EMAIL="${SMOKE_PATIENT_EMAIL:-paciente.demo@corazonmigrante.test}"
THERAPIST_EMAIL="${SMOKE_THERAPIST_EMAIL:-terapeuta.demo@corazonmigrante.test}"
ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-admin@corazonmigrante.test}"
SUPERADMIN_EMAIL="${SMOKE_SUPERADMIN_EMAIL:-superadmin@corazonmigrante.test}"
ACCOUNTANT_EMAIL="${SMOKE_ACCOUNTANT_EMAIL:-contador@corazonmigrante.test}"
TEST_EMAIL="${SMOKE_TEST_EMAIL:-pabliarca@gmail.com}"
export PATIENT_EMAIL THERAPIST_EMAIL ADMIN_EMAIL SUPERADMIN_EMAIL ACCOUNTANT_EMAIL TEST_EMAIL

TMP_DIR="${TMPDIR:-/tmp}/cm-smoke-deep-$$"
mkdir -p "$TMP_DIR"
trap 'rm -rf "$TMP_DIR"' EXIT

PASSED=0
FAILED=0
CURRENT_STEP=""
LAST_BODY=""
LAST_STATUS=""

line() { printf '%s\n' "----------------------------------------------------------------"; }
info() { printf '[INFO] %s\n' "$*"; }
ok() { printf '[OK] %s\n' "$*"; PASSED=$((PASSED+1)); }
fail() { printf '[FAIL] %s\n' "$*"; FAILED=$((FAILED+1)); exit 1; }
step() { CURRENT_STEP="$*"; line; printf '[STEP] %s\n' "$CURRENT_STEP"; }

on_error() {
  local exit_code=$?
  echo ""
  line
  echo "[FAIL] Smoke interrumpido en: ${CURRENT_STEP:-paso desconocido}"
  echo "Codigo de salida: $exit_code"
  if [[ -n "${LAST_STATUS:-}" ]]; then echo "Ultimo HTTP status: $LAST_STATUS"; fi
  if [[ -n "${LAST_BODY:-}" ]]; then
    echo "Ultimo body:"
    echo "$LAST_BODY" | jq . 2>/dev/null || echo "$LAST_BODY"
  fi
  exit "$exit_code"
}
trap on_error ERR

contains_status() {
  local expected_csv="$1"
  local status="$2"
  IFS=',' read -ra items <<< "$expected_csv"
  for item in "${items[@]}"; do
    [[ "${item// /}" == "$status" ]] && return 0
  done
  return 1
}

api() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"
  local expected="${5:-200}"
  local url="$BASE_URL$path"
  local body_file="$TMP_DIR/body.json"
  local header_file="$TMP_DIR/headers.txt"

  local curl_args=(-sS -X "$method" "$url" -D "$header_file" -o "$body_file" -w "%{http_code}" -H "Accept: application/json")
  if [[ -n "$token" ]]; then
    curl_args+=( -H "Authorization: Bearer $token" )
  fi
  if [[ -n "$body" ]]; then
    curl_args+=( -H "Content-Type: application/json" --data "$body" )
  fi

  if [[ "$VERBOSE" == "true" ]]; then
    echo ""
    echo "> $method $url"
    [[ -n "$body" ]] && echo "$body" | jq . 2>/dev/null || true
  fi

  set +e
  local status
  status=$(curl "${curl_args[@]}")
  local curl_code=$?
  set -e

  LAST_STATUS="$status"
  LAST_BODY="$(cat "$body_file" 2>/dev/null || true)"

  if [[ "$curl_code" -ne 0 ]]; then
    echo "curl fallo con codigo $curl_code en $method $path"
    return "$curl_code"
  fi

  if ! contains_status "$expected" "$status"; then
    echo "HTTP inesperado $status en $method $path. Esperado: $expected"
    if [[ -n "$LAST_BODY" ]]; then echo "$LAST_BODY" | jq . 2>/dev/null || echo "$LAST_BODY"; fi
    return 1
  fi

  if [[ "$VERBOSE" == "true" && -n "$LAST_BODY" ]]; then
    echo "$LAST_BODY" | jq . 2>/dev/null || echo "$LAST_BODY"
  fi

  printf '%s' "$LAST_BODY"
}

json_login_body() {
  jq -n --arg email "$1" --arg password "$PASSWORD" '{email:$email,password:$password}'
}

login_user() {
  local email="$1"
  local body
  body="$(json_login_body "$email")"
  api POST "/auth/login" "" "$body" 201
}

extract_token() {
  jq -r '.data.accessToken // empty'
}

extract_refresh() {
  jq -r '.data.refreshToken // empty'
}

require_jq_value() {
  local json="$1"
  local filter="$2"
  local label="$3"
  local value
  value="$(echo "$json" | jq -r "$filter")"
  if [[ -z "$value" || "$value" == "null" ]]; then
    echo "No se pudo obtener $label con jq: $filter"
    echo "$json" | jq . 2>/dev/null || echo "$json"
    return 1
  fi
  printf '%s' "$value"
}

sha256_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
    return
  fi
  fail "FALTA: sha256sum o shasum para verificar integridad del archivo descargado."
}

base64_decode_to_file() {
  local output="$1"
  if base64 --help 2>&1 | grep -q -- '--decode'; then
    base64 --decode > "$output"
  else
    base64 -D > "$output"
  fi
}

env_upper() {
  local key="$1"
  local value
  value="$(read_env_value "$key")"
  printf '%s' "$value" | tr '[:lower:]' '[:upper:]'
}

assert_json_true() {
  local json="$1"
  local filter="$2"
  local message="$3"
  if echo "$json" | jq -e "$filter" >/dev/null; then
    ok "$message"
  else
    echo "$json" | jq . 2>/dev/null || echo "$json"
    fail "$message"
  fi
}

step "Preflight: variables y dependencias"
info "BASE_URL=$BASE_URL"
info "ALLOW_MUTATIONS=$ALLOW_MUTATIONS | PROCESS_OUTBOX=$PROCESS_OUTBOX | EXTERNAL=$EXTERNAL | RUN_BACKUP_DRY_RUN=$RUN_BACKUP_DRY_RUN"
info "TEST_EMAIL=$TEST_EMAIL"
if [[ -f .env ]]; then
  if grep -q 'JWT_REFRESH_SECRET=.*JWT_ACCESS_EXPIRES_IN=' .env; then
    fail "Tu .env tiene JWT_REFRESH_SECRET y JWT_ACCESS_EXPIRES_IN pegados en la misma linea. Separalos antes de continuar."
  fi
  if grep -q 'GOOGLE_CREDENTIALS_BASE64=' .env || grep -q 'DATABASE_PASSWORD=' .env; then
    info "Aviso: este smoke no imprime secretos. Si compartiste claves reales, rotalas luego de probar."
  fi
fi
ok "Preflight OK"

step "Health: API + DB + Redis"
health="$(api GET "/health" "" "" 200)"
assert_json_true "$health" '.data.status == "ok"' "Health status ok"
assert_json_true "$health" '.data.database == "ok"' "Database ok"
# Redis puede devolver ok o un estado descriptivo segun version; si existe, debe ser ok.
if echo "$health" | jq -e '.data.redis? != null' >/dev/null; then
  assert_json_true "$health" '.data.redis == "ok"' "Redis ok"
fi

step "Auth negativo: credenciales invalidas deben fallar"
bad_login="$(jq -n --arg email "$PATIENT_EMAIL" '{email:$email,password:"ClaveIncorrecta123!"}')"
api POST "/auth/login" "" "$bad_login" 401 >/dev/null
ok "Login incorrecto rechazado con 401"

step "Auth positivo: login de todos los roles demo"
patient_login="$(login_user "$PATIENT_EMAIL")"
therapist_login="$(login_user "$THERAPIST_EMAIL")"
admin_login="$(login_user "$ADMIN_EMAIL")"
superadmin_login="$(login_user "$SUPERADMIN_EMAIL")"
accountant_login="$(login_user "$ACCOUNTANT_EMAIL")"

PATIENT_TOKEN="$(echo "$patient_login" | extract_token)"
THERAPIST_TOKEN="$(echo "$therapist_login" | extract_token)"
ADMIN_TOKEN="$(echo "$admin_login" | extract_token)"
SUPERADMIN_TOKEN="$(echo "$superadmin_login" | extract_token)"
ACCOUNTANT_TOKEN="$(echo "$accountant_login" | extract_token)"
PATIENT_REFRESH="$(echo "$patient_login" | extract_refresh)"

[[ -n "$PATIENT_TOKEN" && -n "$THERAPIST_TOKEN" && -n "$ADMIN_TOKEN" && -n "$SUPERADMIN_TOKEN" && -n "$ACCOUNTANT_TOKEN" ]] || fail "No se recibieron todos los accessToken"
ok "Tokens emitidos para paciente, terapeuta, admin, superadmin y contador"

step "Auth: /me y estructura de claims"
me_patient="$(api GET "/me" "$PATIENT_TOKEN" "" 200)"
assert_json_true "$me_patient" '.data.email == env.PATIENT_EMAIL' "Paciente /me correcto"
assert_json_true "$me_patient" '.data.roles | index("PATIENT")' "Paciente tiene rol PATIENT"
me_therapist="$(api GET "/me" "$THERAPIST_TOKEN" "" 200)"
assert_json_true "$me_therapist" '.data.roles | index("THERAPIST")' "Terapeuta tiene rol THERAPIST"
me_admin="$(api GET "/me" "$ADMIN_TOKEN" "" 200)"
assert_json_true "$me_admin" '.data.roles | index("ADMIN")' "Admin tiene rol ADMIN"

step "Auth: refresh y logout con revocacion"
refresh_body="$(jq -n --arg refreshToken "$PATIENT_REFRESH" '{refreshToken:$refreshToken}')"
refresh_response="$(api POST "/auth/refresh" "" "$refresh_body" 201)"
NEW_PATIENT_TOKEN="$(echo "$refresh_response" | extract_token)"
NEW_PATIENT_REFRESH="$(echo "$refresh_response" | extract_refresh)"
[[ -n "$NEW_PATIENT_TOKEN" && -n "$NEW_PATIENT_REFRESH" ]] || fail "Refresh no devolvio nuevos tokens"
api POST "/auth/logout" "" "$(jq -n --arg refreshToken "$NEW_PATIENT_REFRESH" '{refreshToken:$refreshToken}')" 201 >/dev/null
api POST "/auth/refresh" "" "$(jq -n --arg refreshToken "$NEW_PATIENT_REFRESH" '{refreshToken:$refreshToken}')" 401 >/dev/null
ok "Refresh rota tokens y logout revoca refreshToken"

step "RBAC negativo: permisos privados rechazados"
api GET "/admin/users?page=1&limit=5" "$PATIENT_TOKEN" "" 403 >/dev/null
ok "Paciente no puede listar usuarios admin"
api GET "/admin/therapy/approaches?page=1&limit=5" "$ACCOUNTANT_TOKEN" "" 403 >/dev/null
ok "Contador no puede administrar catalogo terapeutico"
api GET "/admin/accounting/accounts?page=1&limit=5" "$ADMIN_TOKEN" "" 403 >/dev/null
ok "Admin sin permiso contable no puede listar contabilidad"

step "Publico: catalogo, CMS y queries clasicas page/limit"
approaches="$(api GET "/therapy/approaches?page=1&limit=10" "" "" 200)"
products="$(api GET "/therapy/products?page=1&limit=10" "" "" 200)"
assert_json_true "$approaches" '.data | length >= 1' "Catalogo publico de enfoques devuelve datos"
assert_json_true "$products" '.data | length >= 1' "Catalogo publico de productos devuelve datos"
api GET "/therapy/products?page=1&limit=999" "" "" 400 >/dev/null
ok "Validacion de limit maximo rechaza limit=999"
cms="$(api GET "/public/pages/inicio" "" "" 200)"
assert_json_true "$cms" '.data.slug == "inicio"' "CMS publico inicio disponible"

step "Admin: usuarios, catalogo, analytics, audit, messaging"
users="$(api GET "/admin/users?page=1&limit=50" "$ADMIN_TOKEN" "" 200)"
assert_json_true "$users" '.data | length >= 5' "Admin lista usuarios demo"
admin_approaches="$(api GET "/admin/therapy/approaches?page=1&limit=10" "$ADMIN_TOKEN" "" 200)"
assert_json_true "$admin_approaches" '.data | length >= 1' "Admin lista enfoques"
api POST "/analytics/ui-events" "" "$(jq -n '{sessionId:"smoke-deep",eventName:"SMOKE_DEEP_VISIT",payload:{source:"bash"}}')" 201 >/dev/null
analytics="$(api GET "/admin/analytics/ui-events?page=1&limit=10" "$ADMIN_TOKEN" "" 200)"
assert_json_true "$analytics" '.data | length >= 1' "Admin ve eventos analytics"
audit="$(api GET "/admin/audit/logs?page=1&limit=10" "$ADMIN_TOKEN" "" 200)"
assert_json_true "$audit" '.data | type == "array"' "Admin consulta auditoria"
outbox="$(api GET "/admin/messaging/outbox?page=1&limit=10" "$ADMIN_TOKEN" "" 200)"
assert_json_true "$outbox" '.data | type == "array"' "Admin consulta outbox"

step "Booking: disponibilidad publica usando terapeuta y producto reales"
THERAPIST_ID="$(echo "$users" | jq -r --arg email "$THERAPIST_EMAIL" '.data[] | select(.email == $email) | .id' | head -n 1)"
PRODUCT_ID="$(echo "$products" | jq -r '.data[0].id // empty')"
[[ -n "$THERAPIST_ID" && -n "$PRODUCT_ID" ]] || fail "No se pudo resolver THERAPIST_ID o PRODUCT_ID"
availability_path="/booking/availability?therapistUserId=${THERAPIST_ID}&productId=${PRODUCT_ID}&from=2026-07-01&to=2026-07-07&timezone=America%2FLa_Paz"
availability="$(api GET "$availability_path" "" "" 200)"
assert_json_true "$availability" '.data.slots | type == "array"' "Disponibilidad devuelve arreglo de slots"
SLOT_START="$(echo "$availability" | jq -r '.data.slots[0].startAt // empty')"
if [[ -n "$SLOT_START" ]]; then ok "Hay al menos un slot disponible para pruebas de cita"; else info "No hay slot libre; se omite creacion de cita aunque --mutations este activo"; fi

step "Terapeuta: agenda propia y validaciones"
schedules="$(api GET "/therapists/me/schedules" "$THERAPIST_TOKEN" "" 200)"
assert_json_true "$schedules" '.data | length >= 1' "Terapeuta lista agenda propia"
invalid_schedule_body="$(jq -n '{weekday:1,startTime:"13:00",endTime:"09:00",timezone:"America/La_Paz",effectiveFrom:"2026-07-01"}')"
api POST "/therapists/me/schedules" "$THERAPIST_TOKEN" "$invalid_schedule_body" 400 >/dev/null
ok "Agenda rechaza rango invalido"

step "Contabilidad: lectura y regla de partida doble"
groups="$(api GET "/admin/accounting/account-groups?page=1&limit=20" "$ACCOUNTANT_TOKEN" "" 200)"
accounts="$(api GET "/admin/accounting/accounts?page=1&limit=20" "$ACCOUNTANT_TOKEN" "" 200)"
assert_json_true "$groups" '.data | length >= 2' "Contador lista grupos de cuenta"
assert_json_true "$accounts" '.data | length >= 2' "Contador lista cuentas"
DEBIT_ACCOUNT_ID="$(echo "$accounts" | jq -r '.data[] | select(.normalBalance == "DEBIT") | .id' | head -n 1)"
CREDIT_ACCOUNT_ID="$(echo "$accounts" | jq -r '.data[] | select(.normalBalance == "CREDIT") | .id' | head -n 1)"
[[ -n "$DEBIT_ACCOUNT_ID" && -n "$CREDIT_ACCOUNT_ID" ]] || fail "No se encontraron cuentas debito/credito demo"
unbalanced_body="$(jq -n --arg debit "$DEBIT_ACCOUNT_ID" --arg credit "$CREDIT_ACCOUNT_ID" '{date:"2026-07-01",description:"Smoke desbalanceado",entries:[{accountId:$debit,debit:100,credit:0},{accountId:$credit,debit:0,credit:99}]}')"
api POST "/admin/accounting/transactions" "$ACCOUNTANT_TOKEN" "$unbalanced_body" 400 >/dev/null
ok "Contabilidad rechaza transaccion desbalanceada"

if [[ "$ALLOW_MUTATIONS" == "true" ]]; then
  step "Mutaciones reales: registro paciente atomico"
  unique="$(date +%s)-$$"
  register_body="$(jq -n --arg email "smoke.patient.${unique}@corazonmigrante.test" '{email:$email,password:"Demo123456!",firstName:"Smoke",lastName:"Paciente",phone:"+59170000000",country:"Bolivia",city:"Santa Cruz"}')"
  new_patient="$(api POST "/auth/register/patient" "" "$register_body" 201)"
  assert_json_true "$new_patient" '.data.email | startswith("smoke.patient.")' "Registro paciente crea usuario completo"

  step "Mutaciones reales: cita, historial, outbox y transiciones"
  if [[ -n "$SLOT_START" ]]; then
    appointment_body="$(jq -n --arg therapistUserId "$THERAPIST_ID" --arg productId "$PRODUCT_ID" --arg scheduledStartAt "$SLOT_START" '{therapistUserId:$therapistUserId,productId:$productId,scheduledStartAt:$scheduledStartAt,timezone:"America/La_Paz",notesForTherapist:"Smoke profundo"}')"
    appointment="$(api POST "/appointments" "$NEW_PATIENT_TOKEN" "$appointment_body" 201)"
    APPOINTMENT_ID="$(require_jq_value "$appointment" '.data.id' 'appointment id')"
    assert_json_true "$appointment" '.data.status == "REQUESTED"' "Cita creada en REQUESTED"
    api PATCH "/appointments/${APPOINTMENT_ID}/status" "$THERAPIST_TOKEN" "$(jq -n '{status:"CONFIRMED",reason:"Smoke confirma"}')" 200 >/dev/null
    api PATCH "/appointments/${APPOINTMENT_ID}/status" "$THERAPIST_TOKEN" "$(jq -n '{status:"REQUESTED",reason:"Smoke transicion invalida"}')" 400 >/dev/null
    ok "Cita confirma transicion valida y rechaza transicion invalida"
  else
    info "Sin slots disponibles; cita real omitida. Revisa seed de therapist_schedules si quieres forzarlo."
  fi

  step "Mutaciones reales: contabilidad balanceada"
  balanced_body="$(jq -n --arg debit "$DEBIT_ACCOUNT_ID" --arg credit "$CREDIT_ACCOUNT_ID" '{date:"2026-07-01",description:"Smoke balanceado",reference:"SMOKE",entries:[{accountId:$debit,debit:100,credit:0},{accountId:$credit,debit:0,credit:100}]}')"
  tx="$(api POST "/admin/accounting/transactions" "$ACCOUNTANT_TOKEN" "$balanced_body" 201)"
  assert_json_true "$tx" '.data.status == "POSTED"' "Transaccion contable balanceada queda POSTED"

  step "Mutaciones reales: CMS admin"
  page_slug="smoke-${unique}"
  page_body="$(jq -n --arg slug "$page_slug" '{slug:$slug,title:"Smoke Page",status:"PUBLISHED",seoMetadata:{description:"Smoke"}}')"
  page="$(api POST "/admin/cms/pages" "$ADMIN_TOKEN" "$page_body" 201)"
  PAGE_ID="$(require_jq_value "$page" '.data.id' 'page id')"
  element_body="$(jq -n '{code:"hero",type:"HERO",content:{title:"Smoke",subtitle:"OK"},sortOrder:1}')"
  api POST "/admin/cms/pages/${PAGE_ID}/elements" "$ADMIN_TOKEN" "$element_body" 201 >/dev/null
  api GET "/public/pages/${page_slug}" "" "" 200 >/dev/null
  ok "CMS crea pagina y elemento visibles publicamente"

  if [[ "$SKIP_FILE_UPLOAD" != "true" ]]; then
    step "Mutaciones reales: upload de imagen PNG 1x1 y verificacion de descarga"
    storage_provider_env="$(env_upper STORAGE_PROVIDER)"
    if [[ "$EXTERNAL" == "true" && "$storage_provider_env" != "GCS" ]]; then
      fail "Para --external, STORAGE_PROVIDER debe ser GCS. Valor actual: ${storage_provider_env:-vacio}."
    fi

    # PNG 1x1 transparente. Es visualmente vacio, pero es un archivo de imagen real y valido.
    png_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
    png_path="$TMP_DIR/smoke-transparent-1x1.png"
    printf '%s' "$png_b64" | base64_decode_to_file "$png_path"
    original_sha="$(sha256_file "$png_path")"
    original_size="$(wc -c < "$png_path" | tr -d ' ')"
    [[ "$original_size" -gt 0 ]] || fail "La imagen de prueba quedo vacia en disco."

    upload_body_file="$TMP_DIR/upload-body.json"
    upload_status=$(curl -sS -X POST "$BASE_URL/files" \
      -H "Authorization: Bearer $NEW_PATIENT_TOKEN" \
      -H "Accept: application/json" \
      -F "module=USER_PROFILE" \
      -F "visibility=PRIVATE" \
      -F "file=@${png_path};filename=smoke-transparent-1x1.png;type=image/png" \
      -o "$upload_body_file" -w "%{http_code}")
    LAST_STATUS="$upload_status"
    LAST_BODY="$(cat "$upload_body_file")"
    if [[ "$upload_status" != "201" ]]; then
      echo "Upload fallo con HTTP $upload_status"
      echo "$LAST_BODY" | jq . 2>/dev/null || echo "$LAST_BODY"
      if [[ "$EXTERNAL" == "true" ]]; then
        exit 1
      else
        info "Upload omitido como fallo no bloqueante porque EXTERNAL=false. Usa --external para exigir GCS/Storage real."
      fi
    else
      FILE_ID="$(require_jq_value "$LAST_BODY" '.data.id' 'file id')"
      signed="$(api GET "/files/${FILE_ID}/signed-url" "$NEW_PATIENT_TOKEN" "" 200)"
      signed_provider="$(require_jq_value "$signed" '.data.provider' 'signed url provider')"
      signed_url="$(require_jq_value "$signed" '.data.url' 'signed url')"

      if [[ "$EXTERNAL" == "true" && "$signed_provider" != "GCS" ]]; then
        echo "$signed" | jq . 2>/dev/null || echo "$signed"
        fail "El archivo se subio, pero no a GCS. Provider devuelto: $signed_provider."
      fi

      downloaded="$TMP_DIR/downloaded-smoke-transparent-1x1.png"
      if [[ "$signed_provider" == "GCS" ]]; then
        download_status=$(curl -sSL "$signed_url" -o "$downloaded" -w "%{http_code}")
      else
        download_status=$(curl -sSL -H "Authorization: Bearer $NEW_PATIENT_TOKEN" "$signed_url" -o "$downloaded" -w "%{http_code}")
      fi
      if [[ "$download_status" != "200" ]]; then
        fail "No se pudo descargar el archivo subido por signed URL. HTTP $download_status. Provider: $signed_provider"
      fi
      downloaded_sha="$(sha256_file "$downloaded")"
      downloaded_size="$(wc -c < "$downloaded" | tr -d ' ')"
      [[ "$downloaded_size" -gt 0 ]] || fail "La descarga por signed URL devolvio archivo vacio."
      if [[ "$downloaded_sha" != "$original_sha" ]]; then
        fail "El checksum de la imagen subida no coincide. Original=$original_sha Descarga=$downloaded_sha"
      fi
      ok "Imagen PNG subida, descargada y verificada por checksum. Provider=$signed_provider Size=${downloaded_size}B"
    fi
  fi
fi

if [[ "$EXTERNAL" == "true" ]]; then
  step "Externo: SendGrid real con correo de prueba"
  email_provider="$(env_upper EMAIL_PROVIDER)"
  if [[ -z "$email_provider" ]]; then email_provider="$(env_upper MAIL_PROVIDER)"; fi
  if [[ "$email_provider" != "SENDGRID" ]]; then
    fail "Para --external, EMAIL_PROVIDER o MAIL_PROVIDER debe ser SENDGRID. Valor actual: ${email_provider:-vacio}."
  fi
  sendgrid_api_key="$(read_env_value SENDGRID_API_KEY)"
  if [[ -z "$sendgrid_api_key" ]]; then
    fail "Para --external, debes configurar SENDGRID_API_KEY."
  fi
  if [[ "$sendgrid_api_key" != SG.* ]]; then
    fail "SENDGRID_API_KEY no parece una API key real de SendGrid. Normalmente debe empezar con 'SG.'."
  fi

  test_email_body="$(jq -n --arg recipient "$TEST_EMAIL" --arg subject "Corazon Migrante - smoke test externo" --arg text "Correo real de prueba del smoke profundo de Corazon Migrante." '{recipient:$recipient,subject:$subject,text:$text}')"
  test_outbox="$(api POST "/admin/messaging/test-email" "$ADMIN_TOKEN" "$test_email_body" 201)"
  TEST_OUTBOX_ID="$(require_jq_value "$test_outbox" '.data.id' 'test outbox id')"
  process_result="$(api POST "/admin/messaging/outbox/process" "$ADMIN_TOKEN" "" 201)"
  assert_json_true "$process_result" '.data.sent >= 1' "SendGrid reporta al menos un correo enviado"
  outbox_after="$(api GET "/admin/messaging/outbox?page=1&limit=50" "$ADMIN_TOKEN" "" 200)"
  if echo "$outbox_after" | jq -e --arg id "$TEST_OUTBOX_ID" '.data[] | select(.id == $id and .recipient == env.TEST_EMAIL and .status == "SENT")' >/dev/null; then
    ok "Correo de prueba enviado y marcado SENT para $TEST_EMAIL"
  else
    echo "$outbox_after" | jq . 2>/dev/null || echo "$outbox_after"
    fail "No se encontro el outbox de prueba como SENT para $TEST_EMAIL."
  fi
elif [[ "$PROCESS_OUTBOX" == "true" ]]; then
  step "Mensajeria: procesar outbox en modo no externo"
  api POST "/admin/messaging/outbox/process" "$ADMIN_TOKEN" "" 201 >/dev/null
  ok "Outbox procesado. En modo no externo puede usar DEV_NULL."
fi

if [[ "$RUN_BACKUP_DRY_RUN" == "true" ]]; then
  step "Backup Neon: dry-run seguro"
  BACKUP_DRY_RUN=true BACKUP_RESTORE_TO_NEON=false yarn db:backup:neon >/tmp/cm-backup-dry-run.log
  ok "Backup dry-run valido comandos sin restaurar en Neon"
fi

line
echo "SMOKE DEEP OK"
echo "Pasos OK: $PASSED"
echo "Base URL: $BASE_URL"
echo "Mutaciones: $ALLOW_MUTATIONS"
echo "Externos exigidos: $EXTERNAL"
line
