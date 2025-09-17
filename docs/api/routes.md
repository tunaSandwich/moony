POST /api/invite-codes/validate
{
  "code": "ABC123",
  "phone_number": "+15551234567"
}

// Success Response (200 OK)
{
  "user": {
    "id": "uuid-here",
    "firstName": "John",
    "lastName": "Doe", 
    "phoneNumber": "+15551234567",
    "hasConnectedBank": false, // derived from plaid_access_token being null
    "twilioStatus": "unverified" // derived from phone_verified being false
  },
  "token": "jwt-token-here" // 30 day expiration
}

Backend Flow:
1. Look up user where invite_code = code AND phone_number = phone_number
2. If found: Generate JWT token (30 day expiration) with user_id
3. Return user data with token

Error Responses:
// Invalid invite code or phone number (404 Not Found)
{ "error": "Invalid invite code or phone number" }

// Missing required fields (400 Bad Request)
{ "error": "Code and phone number are required" }

------------------------------------------------

POST /api/plaid/connect
Header: Authorization: Bearer <jwt-token>
{
  "public_token": "public-sandbox-12345"
}

// Response 200 OK
{
  "message": "Bank connected successfully", 
  "hasConnectedBank": true
}

Backend Flow:
1. Validate JWT from Authorization header, extract user_id
2. Call Plaid API POST /item/public_token/exchange with:
   - client_id (from env)
   - secret (from env) 
   - public_token (from request)
3. Encrypt the returned access_token
4. Update users.plaid_access_token with encrypted token
5. Return success response

Error Responses:
// Invalid/expired JWT (401 Unauthorized)
{ "error": "Invalid or expired token" }

// Missing Authorization header (401 Unauthorized)
{ "error": "Authorization token required" }

// Invalid Plaid public token (400 Bad Request)
{ "error": "Invalid Plaid token" }

// Plaid API error (502 Bad Gateway)
{ "error": "Unable to connect to bank. Please try again." }

// Missing public_token (400 Bad Request)
{ "error": "Public token is required" }

------------------------------------------------

POST /api/twilio/send-code
Header: Authorization: Bearer <jwt-token>

// Response 200 OK
{
  "message": "Verification code sent successfully"
}

Backend Flow:
1. Validate JWT from Authorization header, extract user_id
2. Look up user's phone_number from database
3. Call Twilio Verify API POST /v2/Services/{ServiceSID}/Verifications with:
   - To: user's phone_number
   - Channel: "sms"
4. Return success response

Error Responses:
// Invalid/expired JWT (401 Unauthorized)
{ "error": "Invalid or expired token" }

// Missing Authorization header (401 Unauthorized)
{ "error": "Authorization token required" }

// User not found (404 Not Found)
{ "error": "User not found" }

// Twilio API error (502 Bad Gateway)
{ "error": "Unable to send verification code. Please try again." }

// Phone already verified (409 Conflict)
{ "error": "Phone number is already verified" }

------------------------------------------------

POST /api/twilio/verify-number
Header: Authorization: Bearer <jwt-token>
{
  "code": "123456"
}

// Response 200 OK
{
  "message": "Phone number verified successfully",
  "twilioStatus": "verified"
}

Backend Flow:
1. Validate JWT from Authorization header, extract user_id
2. Look up user's phone_number from database
3. Call Twilio Verify API POST /v2/Services/{ServiceSID}/VerificationCheck with:
   - To: user's phone_number
   - Code: code from request
4. If verification successful: Update users.phone_verified = true
5. Return success response

Error Responses:
// Invalid/expired JWT (401 Unauthorized)
{ "error": "Invalid or expired token" }

// Missing Authorization header (401 Unauthorized)
{ "error": "Authorization token required" }

// User not found (404 Not Found)
{ "error": "User not found" }

// Invalid verification code (400 Bad Request)
{ "error": "Invalid verification code" }

// Missing code (400 Bad Request)
{ "error": "Verification code is required" }

// Twilio API error (502 Bad Gateway)
{ "error": "Unable to verify code. Please try again." }

// Code expired (410 Gone)
{ "error": "Verification code has expired. Please request a new code." }

------------------------------------------------

POST /api/webhooks/twilio/incoming-message
{
  "From": "+15551234567",
  "Body": "3000",
  "MessageSid": "SM1234567890abcdef1234567890abcdef"
}

// Response 200 OK (TwiML)
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>

Backend Flow:
1. Validate Twilio webhook signature for security
2. Look up user by phone number (From field)
3. Parse message body:
   - If numeric (e.g., "3000"): Set as monthly spending goal
   - If "SAME": Use previous month's goal
   - If invalid: Send error message
4. Create new spending_goal record with:
   - monthly_limit = parsed amount
   - period_start = current month start based on user's month_start_day
   - period_end = next month start - 1 day
   - is_active = true (set previous goals to false)
5. Send confirmation SMS via Twilio API
6. Return empty TwiML response

Error Responses:
// Invalid Twilio signature (401 Unauthorized)
{ "error": "Unauthorized webhook request" }

// User not found (404 Not Found)
{ "error": "Phone number not found" }

// Invalid message format (400 Bad Request)
{ "error": "Invalid spending goal format" }

// Missing required fields (400 Bad Request)
{ "error": "Missing required webhook data" }
