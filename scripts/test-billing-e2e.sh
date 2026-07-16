#!/usr/bin/env bash
# Test E2E del flujo de billing Mercado Pago
# Ejecuta: create → check → cancel → check
# Usa X-Test-Secret (no requiere JWT)
#
# Uso: bash scripts/test-billing-e2e.sh

set -euo pipefail

SUPABASE_URL="https://ropbkdqhqdeiwrenrmjt.supabase.co"
TEST_SECRET="***"
PASS=0
FAIL=0

green() { echo "  ✅ $1"; ((PASS++)); }
red() { echo "  ❌ $1"; ((FAIL++)); }
sep() { echo "  ─────────────────────────────"; }

HEADERS=(
  -H "Content-Type: application/json"
  -H "X-Test-Secret: ${TEST_SECRET}"
)

echo ""
echo "🧪 Test E2E — Billing Mercado Pago"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Verificar TEST_SECRET configurado ──
echo "📋 1. Verificando TEST_SECRET..."
if [ -z "${TEST_SECRET}" ]; then
  red "TEST_SECRET no configurado en el script"
  echo ""
  echo "Resultado: ${PASS} pasaron, ${FAIL} fallaron"
  exit 1
fi
green "TEST_SECRET presente"

# ── 2. mp-check-subscription (estado inicial) ──
echo ""
echo "📋 2. mp-check-subscription (estado inicial)"
CHECK1=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/mp-check-subscription" \
  "${HEADERS[@]}" \
  -d '{}')
echo "     Respuesta: ${CHECK1}"

if echo "$CHECK1" | grep -q '"error"'; then
  red "check-subscription falló: $(echo "$CHECK1" | grep -o '"error":"[^"]*"' | head -1)"
else
  green "check-subscription respondió OK"
fi
sep

# ── 3. mp-create-subscription ──
echo ""
echo "📋 3. mp-create-subscription"
CREATE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/mp-create-subscription" \
  "${HEADERS[@]}" \
  -d '{}')
echo "     Respuesta: ${CREATE}"

if echo "$CREATE" | grep -q '"checkout_url"'; then
  CHECKOUT_URL=$(echo "$CREATE" | grep -o '"checkout_url":"[^"]*"' | cut -d'"' -f4)
  green "create-subscription devolvió checkout_url"
  echo "     → URL: ${CHECKOUT_URL}"
elif echo "$CREATE" | grep -q '"already_subscribed"'; then
  green "Ya estaba suscripto (already_subscribed)"
else
  red "create-subscription falló: $(echo "$CREATE" | grep -o '"error":"[^"]*"' | head -1)"
fi
sep

# ── 4. mp-check-subscription (después de create) ──
echo ""
echo "📋 4. mp-check-subscription (post-create)"
CHECK2=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/mp-check-subscription" \
  "${HEADERS[@]}" \
  -d '{}')
echo "     Respuesta: ${CHECK2}"

if echo "$CHECK2" | grep -q '"error"'; then
  red "check-subscription falló"
else
  green "check-subscription respondió OK"
fi
sep

# ── 5. mp-cancel-subscription ──
echo ""
echo "📋 5. mp-cancel-subscription"
CANCEL=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/mp-cancel-subscription" \
  "${HEADERS[@]}" \
  -d '{}')
echo "     Respuesta: ${CANCEL}"

if echo "$CANCEL" | grep -q '"success"'; then
  green "cancel-subscription OK (suscripción pausada)"
elif echo "$CANCEL" | grep -q '"error"'; then
  ERR_MSG=$(echo "$CANCEL" | grep -o '"error":"[^"]*"' | head -1)
  if echo "$ERR_MSG" | grep -qi "no active subscription\|no company found\|only admins"; then
    echo "  ⚠️  Cancelación esperada: $ERR_MSG"
  else
    red "cancel-subscription falló: $ERR_MSG"
  fi
else
  red "cancel-subscription: respuesta inesperada"
fi
sep

# ── 6. mp-check-subscription (después de cancel) ──
echo ""
echo "📋 6. mp-check-subscription (post-cancel)"
CHECK3=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/mp-check-subscription" \
  "${HEADERS[@]}" \
  -d '{}')
echo "     Respuesta: ${CHECK3}"

if echo "$CHECK3" | grep -q '"error"'; then
  red "check-subscription falló"
else
  green "check-subscription respondió OK"
fi

# ── 7. mp-webhook (simulado) ──
echo ""
echo "📋 7. mp-webhook (simulado con firma válida)"
TS=$(date +%s)
DATA_ID="e2e-test-${TS}"
REQUEST_ID="req-${TS}"
MANIFEST="id:${DATA_ID};request-id:${REQUEST_ID};ts:${TS};"
SECRET="***"
SIG=$(echo -n "$MANIFEST" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')

WEBHOOK=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/mp-webhook" \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=${TS},v1=${SIG}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -d "{\"type\": \"subscription_preapproval\", \"data\": {\"id\": \"${DATA_ID}\"}}")
echo "     Respuesta: ${WEBHOOK}"

if echo "$WEBHOOK" | grep -q '"received"'; then
  green "webhook procesado correctamente"
else
  red "webhook falló"
fi

# ── Resultado ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 Resultado: ${PASS} pasaron, ${FAIL} fallaron"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
