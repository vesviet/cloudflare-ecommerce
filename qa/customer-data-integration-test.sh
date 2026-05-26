#!/bin/bash
set -e

echo "======================================================================"
echo "         Phase 5: Customer Data Integration Testing (QA)              "
echo "======================================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'

API_URL="http://localhost:8788"
WRANGLER="pnpm --filter admin-api exec wrangler"

# Clean up any existing test data to ensure test isolation
echo -e "${YELLOW}[*] Cleaning up existing QA test customers and orders...${NC}"
$WRANGLER d1 execute ecommerce-db-prod --local --command "
  DELETE FROM customers WHERE email LIKE 'qa_test_%';
  DELETE FROM orders WHERE guest_email LIKE 'qa_test_%' OR customer_id IN (SELECT id FROM customers WHERE email LIKE 'qa_test_%');
" > /dev/null

echo -e "${GREEN}[✓] DB cleaned up.${NC}"

# ======================================================================
# SCENARIO 1: Account Suspension Enforcement (Security & Auth)
# ======================================================================
echo ""
echo "----------------------------------------------------------------------"
echo "Scenario 1: Account Suspension Enforcement"
echo "----------------------------------------------------------------------"

# 1. Register a new customer
echo -e "${YELLOW}[1.1] Registering a new active customer...${NC}"
REG_RES=$(curl -s -i -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "qa_test_suspended@example.com", "password": "password123", "firstName": "QA", "lastName": "Suspended"}')

# Extract token from Set-Cookie header
TOKEN=$(echo "$REG_RES" | grep -i "set-cookie:" | grep -o "aura_token=[^;]*" | head -n 1)
if [ -z "$TOKEN" ]; then
  echo -e "${RED}[✗] Failed to extract aura_token from cookie headers.${NC}"
  echo "$REG_RES"
  exit 1
fi

echo -e "${GREEN}[✓] Customer registered. Cookie: $TOKEN${NC}"

# 2. Get profile (Should be 200 OK)
echo -e "${YELLOW}[1.2] Accessing profile (should succeed)...${NC}"
PROFILE_RES=$(curl -s -w "%{http_code}" -o /dev/null -b "$TOKEN" "$API_URL/customer/me")
if [ "$PROFILE_RES" != "200" ]; then
  echo -e "${RED}[✗] Expected profile access to return 200, got $PROFILE_RES${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Profile accessible (HTTP $PROFILE_RES)${NC}"

# 3. Update customer to suspended in D1 database
echo -e "${YELLOW}[1.3] Suspending the customer in D1...${NC}"
$WRANGLER d1 execute ecommerce-db-prod --local --command "
  UPDATE customers SET status = 'suspended' WHERE email = 'qa_test_suspended@example.com'
" > /dev/null

# Double check D1 status
STATUS_RES=$($WRANGLER d1 execute ecommerce-db-prod --local --command "SELECT status FROM customers WHERE email = 'qa_test_suspended@example.com'" --json)
STATUS=$(echo "$STATUS_RES" | jq -r '.[0].results[0].status')
echo -e "${GREEN}[✓] D1 database verifies status is: $STATUS${NC}"

# 4. Access profile again (Should return 403 and evict cookie)
echo -e "${YELLOW}[1.4] Accessing profile after suspension (should be blocked and evict cookie)...${NC}"
SUSP_PROFILE_RES=$(curl -s -i -b "$TOKEN" "$API_URL/customer/me")

HTTP_STATUS=$(echo "$SUSP_PROFILE_RES" | grep "HTTP/" | awk '{print $2}')
COOKIE_EVICTED=$(echo "$SUSP_PROFILE_RES" | grep -i "set-cookie: aura_token=" | grep -E "Max-Age=0|Expires=" || true)

if [ "$HTTP_STATUS" != "403" ]; then
  echo -e "${RED}[✗] Expected HTTP 403 Forbidden, got $HTTP_STATUS${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Profile access returned expected 403 Forbidden.${NC}"

if [ -z "$COOKIE_EVICTED" ]; then
  echo -e "${RED}[✗] Cookie was not evicted in the response headers.${NC}"
  echo "$SUSP_PROFILE_RES"
  exit 1
fi
echo -e "${GREEN}[✓] Auth cookie was successfully evicted in the response (Set-Cookie).${NC}"

# ======================================================================
# SCENARIO 2: Address KV Cache Write-Through Invalidation
# ======================================================================
echo ""
echo "----------------------------------------------------------------------"
echo "Scenario 2: Address KV Cache Invalidation"
echo "----------------------------------------------------------------------"

# 1. Register a customer for address book testing
echo -e "${YELLOW}[2.1] Registering customer for address testing...${NC}"
REG_RES2=$(curl -s -i -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "qa_test_addresses@example.com", "password": "password123", "firstName": "QA", "lastName": "Addresses"}')

TOKEN2=$(echo "$REG_RES2" | grep -i "set-cookie:" | grep -o "aura_token=[^;]*" | head -n 1)

# 2. Get addresses (First request: should fetch from DB)
echo -e "${YELLOW}[2.2] Listing addresses (First request, should query DB)...${NC}"
LIST_RES1=$(curl -s -b "$TOKEN2" "$API_URL/customer/addresses")
SOURCE1=$(echo "$LIST_RES1" | jq -r '.source')

if [ "$SOURCE1" != "db" ]; then
  echo -e "${RED}[✗] Expected first fetch source to be 'db', got '$SOURCE1'${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] First list source is '$SOURCE1'${NC}"

# 3. Get addresses again (Second request: should fetch from Cache)
echo -e "${YELLOW}[2.3] Listing addresses again (Second request, should fetch from KV Cache)...${NC}"
LIST_RES2=$(curl -s -b "$TOKEN2" "$API_URL/customer/addresses")
SOURCE2=$(echo "$LIST_RES2" | jq -r '.source')

if [ "$SOURCE2" != "cache" ]; then
  echo -e "${RED}[✗] Expected second fetch source to be 'cache', got '$SOURCE2'${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Second list source is '$SOURCE2' (KV cache hits!)${NC}"

# 4. Add a new address (should evict cache)
echo -e "${YELLOW}[2.4] Adding a new address (should invalidate KV cache)...${NC}"
ADD_RES=$(curl -s -X POST "$API_URL/customer/addresses" \
  -H "Content-Type: application/json" \
  -b "$TOKEN2" \
  -d '{
    "alias": "Work",
    "first_name": "QA",
    "last_name": "Worker",
    "company": "QA Corp",
    "vat_id": "VAT-999",
    "address_1": "789 Work St",
    "city": "Da Nang",
    "postcode": "550000",
    "country": "VN",
    "phone": "987654321",
    "delivery_instructions": "Leave at front desk"
  }')

ADD_SUCCESS=$(echo "$ADD_RES" | jq -r '.success')
ADDRESS_ID=$(echo "$ADD_RES" | jq -r '.id')

if [ "$ADD_SUCCESS" != "true" ] || [ -z "$ADDRESS_ID" ]; then
  echo -e "${RED}[✗] Failed to create address.${NC}"
  echo "$ADD_RES"
  exit 1
fi
echo -e "${GREEN}[✓] Address added with ID: $ADDRESS_ID${NC}"

# 5. List addresses (should fetch from DB because cache is invalidated)
echo -e "${YELLOW}[2.5] Listing addresses after adding (should query DB)...${NC}"
LIST_RES3=$(curl -s -b "$TOKEN2" "$API_URL/customer/addresses")
SOURCE3=$(echo "$LIST_RES3" | jq -r '.source')
ADDR_COUNT=$(echo "$LIST_RES3" | jq '.data | length')

if [ "$SOURCE3" != "db" ]; then
  echo -e "${RED}[✗] Expected post-add source to be 'db', got '$SOURCE3'${NC}"
  exit 1
fi
if [ "$ADDR_COUNT" != "1" ]; then
  echo -e "${RED}[✗] Expected address list size 1, got $ADDR_COUNT${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Address list retrieved from '$SOURCE3' showing $ADDR_COUNT address.${NC}"

# 6. List addresses again (should hit cache)
echo -e "${YELLOW}[2.6] Listing addresses again (should hit KV Cache)...${NC}"
LIST_RES4=$(curl -s -b "$TOKEN2" "$API_URL/customer/addresses")
SOURCE4=$(echo "$LIST_RES4" | jq -r '.source')
if [ "$SOURCE4" != "cache" ]; then
  echo -e "${RED}[✗] Expected cache source, got '$SOURCE4'${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Cache hit verified: '$SOURCE4'${NC}"

# 7. Update address (should invalidate cache)
echo -e "${YELLOW}[2.7] Updating the address (should invalidate KV cache)...${NC}"
UPDATE_RES=$(curl -s -X PUT "$API_URL/customer/addresses/$ADDRESS_ID" \
  -H "Content-Type: application/json" \
  -b "$TOKEN2" \
  -d '{
    "alias": "Work Office",
    "first_name": "QA Updated",
    "last_name": "Worker",
    "address_1": "789 Work St",
    "city": "Da Nang",
    "postcode": "550000",
    "country": "VN"
  }')

UPDATE_SUCCESS=$(echo "$UPDATE_RES" | jq -r '.success')
if [ "$UPDATE_SUCCESS" != "true" ]; then
  echo -e "${RED}[✗] Address update failed.${NC}"
  echo "$UPDATE_RES"
  exit 1
fi

LIST_RES5=$(curl -s -b "$TOKEN2" "$API_URL/customer/addresses")
SOURCE5=$(echo "$LIST_RES5" | jq -r '.source')
if [ "$SOURCE5" != "db" ]; then
  echo -e "${RED}[✗] Expected post-update source to be 'db', got '$SOURCE5'${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Address updated. KV cache invalidated successfully ('$SOURCE5').${NC}"

# 8. Delete address (should invalidate cache)
echo -e "${YELLOW}[2.8] Deleting the address (should invalidate KV cache)...${NC}"
DELETE_RES=$(curl -s -X DELETE "$API_URL/customer/addresses/$ADDRESS_ID" -b "$TOKEN2")
DELETE_SUCCESS=$(echo "$DELETE_RES" | jq -r '.success')
if [ "$DELETE_SUCCESS" != "true" ]; then
  echo -e "${RED}[✗] Address deletion failed.${NC}"
  echo "$DELETE_RES"
  exit 1
fi

LIST_RES6=$(curl -s -b "$TOKEN2" "$API_URL/customer/addresses")
SOURCE6=$(echo "$LIST_RES6" | jq -r '.source')
if [ "$SOURCE6" != "db" ]; then
  echo -e "${RED}[✗] Expected post-delete source to be 'db', got '$SOURCE6'${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Address deleted. KV cache invalidated successfully ('$SOURCE6').${NC}"


# ======================================================================
# SCENARIO 3: Checkout Payload Accuracy & D1 Persistence
# ======================================================================
echo ""
echo "----------------------------------------------------------------------"
echo "Scenario 3: Checkout Payload Accuracy & D1 Persistence"
echo "----------------------------------------------------------------------"

# 1. Run checkout order
echo -e "${YELLOW}[3.1] Submitting a guest order with UTM, B2B company data...${NC}"
CHECKOUT_RES=$(curl -s -X POST "$API_URL/store/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa_test_checkout@example.com",
    "items": [{"variation_id": "var_123", "quantity": 2}],
    "shipping_fee": 15,
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer",
    "affiliate_id": "aff_999",
    "shipping_address_json": {
      "first_name": "Guest",
      "last_name": "Checkout",
      "company": "Target Corp",
      "vat_id": "VAT-777",
      "address_1": "101 Guest Way",
      "city": "Can Tho",
      "postcode": "900000",
      "country": "VN"
    },
    "billing_address_json": {
      "first_name": "Guest",
      "last_name": "Checkout",
      "company": "Target Corp",
      "vat_id": "VAT-777",
      "address_1": "101 Guest Way",
      "city": "Can Tho",
      "postcode": "900000",
      "country": "VN"
    }
  }')

ORDER_SUCCESS=$(echo "$CHECKOUT_RES" | jq -r '.success')
ORDER_ID=$(echo "$CHECKOUT_RES" | jq -r '.orderId')

if [ "$ORDER_SUCCESS" != "true" ] || [ -z "$ORDER_ID" ]; then
  echo -e "${RED}[✗] Checkout failed.${NC}"
  echo "$CHECKOUT_RES"
  exit 1
fi
echo -e "${GREEN}[✓] Order created successfully. Order ID: $ORDER_ID${NC}"

# 2. Verify orders table in D1 database
echo -e "${YELLOW}[3.2] Verifying UTM and attribution data in D1 orders table...${NC}"
ORDER_DB_RES=$($WRANGLER d1 execute ecommerce-db-prod --local \
  --command "SELECT utm_source, shipping_fee, total_amount, guest_email FROM orders WHERE id = '$ORDER_ID'" --json)

DB_UTM_SOURCE=$(echo "$ORDER_DB_RES" | jq -r '.[0].results[0].utm_source')
DB_SHIPPING_FEE=$(echo "$ORDER_DB_RES" | jq -r '.[0].results[0].shipping_fee')
DB_TOTAL_AMOUNT=$(echo "$ORDER_DB_RES" | jq -r '.[0].results[0].total_amount')
DB_GUEST_EMAIL=$(echo "$ORDER_DB_RES" | jq -r '.[0].results[0].guest_email')

if [ "$DB_UTM_SOURCE" != "google" ]; then
  echo -e "${RED}[✗] Expected utm_source 'google', got '$DB_UTM_SOURCE'${NC}"
  exit 1
fi
if [ "$DB_SHIPPING_FEE" != "15" ]; then
  echo -e "${RED}[✗] Expected shipping_fee '15', got '$DB_SHIPPING_FEE'${NC}"
  exit 1
fi
# Order is 2 items * 90 (sale_price) = 180 total
if [ "$DB_TOTAL_AMOUNT" != "180" ]; then
  echo -e "${RED}[✗] Expected total_amount '180', got '$DB_TOTAL_AMOUNT'${NC}"
  exit 1
fi
if [ "$DB_GUEST_EMAIL" != "qa_test_checkout@example.com" ]; then
  echo -e "${RED}[✗] Expected guest_email 'qa_test_checkout@example.com', got '$DB_GUEST_EMAIL'${NC}"
  exit 1
fi

echo -e "${GREEN}[✓] Verified UTM source ('$DB_UTM_SOURCE'), shipping fee ($DB_SHIPPING_FEE), and total amount ($DB_TOTAL_AMOUNT) in D1 orders table.${NC}"

# 3. Verify B2B Address data in D1 orders table
echo -e "${YELLOW}[3.3] Verifying B2B fields (company, VAT) in order address JSON in D1...${NC}"
ADDR_DB_RES=$($WRANGLER d1 execute ecommerce-db-prod --local \
  --command "SELECT shipping_address_json FROM orders WHERE id = '$ORDER_ID'" --json)

DB_COMPANY=$(echo "$ADDR_DB_RES" | jq -r '.[0].results[0].shipping_address_json' | jq -r '.company')
DB_VAT_ID=$(echo "$ADDR_DB_RES" | jq -r '.[0].results[0].shipping_address_json' | jq -r '.vat_id')

if [ "$DB_COMPANY" != "Target Corp" ]; then
  echo -e "${RED}[✗] Expected company 'Target Corp', got '$DB_COMPANY'${NC}"
  exit 1
fi
if [ "$DB_VAT_ID" != "VAT-777" ]; then
  echo -e "${RED}[✗] Expected vat_id 'VAT-777', got '$DB_VAT_ID'${NC}"
  exit 1
fi

echo -e "${GREEN}[✓] Verified company ('$DB_COMPANY') and VAT ID ('$DB_VAT_ID') stored inside D1 order shipping address json.${NC}"

echo ""
echo "======================================================================"
echo -e "${GREEN}🎉 ALL INTEGRATION SCENARIOS PASS SUCCESSFULLY!${NC}"
echo "======================================================================"
