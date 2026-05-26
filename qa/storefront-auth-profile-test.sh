#!/bin/bash
set -e

echo "======================================================================"
echo "    Storefront Auth, Profile & Change Password Integration Test (QA)  "
echo "======================================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'

API_URL="http://localhost:8787/api"
WRANGLER="pnpm --filter public-api exec wrangler"

# Clean up existing test customers
echo -e "${YELLOW}[*] Cleaning up QA test customer...${NC}"
$WRANGLER d1 execute ecommerce-db-prod --local --command "
  DELETE FROM customers WHERE email = 'qa_storefront_test@example.com';
" > /dev/null
echo -e "${GREEN}[✓] Database cleaned.${NC}"

# ======================================================================
# SCENARIO 1: Register and Login
# ======================================================================
echo ""
echo "----------------------------------------------------------------------"
echo "Scenario 1: Customer Registration and Authentication"
echo "----------------------------------------------------------------------"

echo -e "${YELLOW}[1.1] Registering a new customer on public-api...${NC}"
REG_RES=$(curl -s -i -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "qa_storefront_test@example.com", "password": "password123", "firstName": "QA", "lastName": "Storefront"}')

TOKEN=$(echo "$REG_RES" | grep -i "set-cookie:" | grep -o "aura_token=[^;]*" | head -n 1)
if [ -z "$TOKEN" ]; then
  echo -e "${RED}[✗] Failed to extract aura_token from cookie headers.${NC}"
  echo "$REG_RES"
  exit 1
fi
echo -e "${GREEN}[✓] Customer registered. Cookie: $TOKEN${NC}"

# Get profile
echo -e "${YELLOW}[1.2] Accessing profile (should succeed)...${NC}"
PROFILE_RES=$(curl -s -w "%{http_code}" -o /dev/null -b "$TOKEN" "$API_URL/customer/me")
if [ "$PROFILE_RES" != "200" ]; then
  echo -e "${RED}[✗] Expected profile access to return 200, got $PROFILE_RES${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Profile accessible (HTTP $PROFILE_RES)${NC}"

# ======================================================================
# SCENARIO 2: Edit Profile & GDPR / B2B Consent
# ======================================================================
echo ""
echo "----------------------------------------------------------------------"
echo "Scenario 2: Update Profile details (B2B and Marketing)"
echo "----------------------------------------------------------------------"

echo -e "${YELLOW}[2.1] Updating profile details...${NC}"
UPDATE_RES=$(curl -s -X PUT "$API_URL/customer/me" \
  -H "Content-Type: application/json" \
  -b "$TOKEN" \
  -d '{
    "first_name": "QA Updated",
    "last_name": "Storefront",
    "phone": "+84999999999",
    "dob": "1995-10-10",
    "gender": "male",
    "company_name": "QA Storefront Company",
    "vat_tax_id": "VAT-STOREFRONT-123",
    "accepts_marketing": true
  }')

UPDATE_SUCCESS=$(echo "$UPDATE_RES" | jq -r '.success')
if [ "$UPDATE_SUCCESS" != "true" ]; then
  echo -e "${RED}[✗] Profile update failed.${NC}"
  echo "$UPDATE_RES"
  exit 1
fi
echo -e "${GREEN}[✓] Profile update API returned success.${NC}"

# Fetch profile to verify
echo -e "${YELLOW}[2.2] Verifying updated profile fields...${NC}"
PROFILE_DATA=$(curl -s -b "$TOKEN" "$API_URL/customer/me" | jq -r '.data')

FIRST_NAME=$(echo "$PROFILE_DATA" | jq -r '.first_name')
COMPANY=$(echo "$PROFILE_DATA" | jq -r '.company_name')
VAT=$(echo "$PROFILE_DATA" | jq -r '.vat_tax_id')
GDPR=$(echo "$PROFILE_DATA" | jq -r '.accepts_marketing')

if [ "$FIRST_NAME" != "QA Updated" ] || [ "$COMPANY" != "QA Storefront Company" ] || [ "$VAT" != "VAT-STOREFRONT-123" ] || [ "$GDPR" != "1" ]; then
  echo -e "${RED}[✗] Profile verification failed. Data: $PROFILE_DATA${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Verified first_name: '$FIRST_NAME', company: '$COMPANY', VAT: '$VAT', GDPR: '$GDPR'${NC}"

# ======================================================================
# SCENARIO 3: Change Password Flow and Validations
# ======================================================================
echo ""
echo "----------------------------------------------------------------------"
echo "Scenario 3: Secure Change Password Flow"
echo "----------------------------------------------------------------------"

# 1. Incorrect current password
echo -e "${YELLOW}[3.1] Attempting password change with wrong current password...${NC}"
WRONG_CURR_RES=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_URL/customer/me/change-password" \
  -H "Content-Type: application/json" \
  -b "$TOKEN" \
  -d '{"current_password": "wrongpassword", "new_password": "newpassword123"}')

WRONG_STATUS=$(echo "$WRONG_CURR_RES" | tail -n 1 | cut -d: -f2)
WRONG_BODY=$(echo "$WRONG_CURR_RES" | head -n -1)
WRONG_ERR=$(echo "$WRONG_BODY" | jq -r '.error')

if [ "$WRONG_STATUS" != "401" ] || [ "$WRONG_ERR" != "Mật khẩu hiện tại không đúng." ]; then
  echo -e "${RED}[✗] Expected HTTP 401 and custom error, got HTTP $WRONG_STATUS, error: $WRONG_ERR${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Fails correctly with HTTP $WRONG_STATUS and message: '$WRONG_ERR'${NC}"

# 2. Identical password reuse block
echo -e "${YELLOW}[3.2] Attempting password change with identical new password...${NC}"
REUSE_RES=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_URL/customer/me/change-password" \
  -H "Content-Type: application/json" \
  -b "$TOKEN" \
  -d '{"current_password": "password123", "new_password": "password123"}')

REUSE_STATUS=$(echo "$REUSE_RES" | tail -n 1 | cut -d: -f2)
REUSE_BODY=$(echo "$REUSE_RES" | head -n -1)
REUSE_ERR=$(echo "$REUSE_BODY" | jq -r '.error')

if [ "$REUSE_STATUS" != "400" ] || [ "$REUSE_ERR" != "Mật khẩu mới không được trùng với mật khẩu cũ" ]; then
  echo -e "${RED}[✗] Expected HTTP 400 and custom error, got HTTP $REUSE_STATUS, error: $REUSE_ERR${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] Fails correctly with HTTP $REUSE_STATUS and message: '$REUSE_ERR'${NC}"

# 3. Successful change
echo -e "${YELLOW}[3.3] Changing password with correct current and valid new password...${NC}"
SUCCESS_RES=$(curl -s -X PUT "$API_URL/customer/me/change-password" \
  -H "Content-Type: application/json" \
  -b "$TOKEN" \
  -d '{"current_password": "password123", "new_password": "newpassword123"}')

SUCCESS_STATE=$(echo "$SUCCESS_RES" | jq -r '.success')
if [ "$SUCCESS_STATE" != "true" ]; then
  echo -e "${RED}[✗] Password change failed.${NC}"
  echo "$SUCCESS_RES"
  exit 1
fi
echo -e "${GREEN}[✓] Password changed successfully.${NC}"

# 4. Verify login with the new password
echo -e "${YELLOW}[3.4] Authenticating login with new password...${NC}"
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "qa_storefront_test@example.com", "password": "newpassword123"}')

LOGIN_SUCCESS=$(echo "$LOGIN_RES" | jq -r '.success')
if [ "$LOGIN_SUCCESS" != "true" ]; then
  echo -e "${RED}[✗] Login with new password failed.${NC}"
  echo "$LOGIN_RES"
  exit 1
fi
echo -e "${GREEN}[✓] Logged in successfully using new password.${NC}"

echo ""
echo "======================================================================"
echo -e "${GREEN}🎉 ALL STOREFRONT INTEGRATION SCENARIOS PASS SUCCESSFULLY!${NC}"
echo "======================================================================"
