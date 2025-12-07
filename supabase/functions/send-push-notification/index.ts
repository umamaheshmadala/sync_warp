// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  userId: string
  title: string
  body: string
  data?: Record<string, any>
}

interface PushToken {
  token: string
  platform: 'ios' | 'android'
}

/**
 * Generate OAuth2 access token from service account credentials
 * Required for FCM V1 API authentication
 */
async function getAccessToken(): Promise<string> {
  const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT')
  
  if (!FCM_SERVICE_ACCOUNT) {
    throw new Error('FCM_SERVICE_ACCOUNT not configured in Supabase Vault')
  }

  let serviceAccount
  try {
    serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT)
  } catch (e) {
    throw new Error('Invalid FCM_SERVICE_ACCOUNT JSON format')
  }

  const { client_email, private_key } = serviceAccount
  
  if (!client_email || !private_key) {
    throw new Error('FCM_SERVICE_ACCOUNT missing required fields: client_email, private_key')
  }

  // Import JWT library for Deno
  const { create } = await import('https://deno.land/x/djwt@v2.8/mod.ts')

  // Prepare JWT claims
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
  }

  // Import private key
  const keyData = private_key.replace(/\\n/g, '\n')
  const pemHeader = '-----BEGIN PRIVATE KEY-----'
  const pemFooter = '-----END PRIVATE KEY-----'
  const pemContents = keyData
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '')
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  // Create JWT
  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    payload,
    cryptoKey
  )

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    console.error('OAuth2 Error:', error)
    throw new Error(`Failed to get access token: ${tokenResponse.status}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

/**
 * Send notification to FCM (Android)
 * Uses Firebase Cloud Messaging V1 API
 */
async function sendToFCM(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>
): Promise<any> {
  const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT')
  
  if (!FCM_SERVICE_ACCOUNT) {
    throw new Error('FCM_SERVICE_ACCOUNT not configured in Supabase Vault')
  }

  // Parse service account to get project ID
  const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT)
  const projectId = serviceAccount.project_id
  
  if (!projectId) {
    throw new Error('project_id not found in FCM_SERVICE_ACCOUNT')
  }

  // Get OAuth2 access token
  const accessToken = await getAccessToken()

  // Build FCM V1 API payload
  const fcmPayload = {
    message: {
      token: token,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        // FCM V1 requires all data values to be strings
        title,
        body,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: 'default',
        },
      },
    },
  }

  console.log(`Sending FCM V1 notification to token: ${token.substring(0, 20)}...`)

  // FCM V1 API endpoint
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

  const response = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fcmPayload),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('FCM V1 Error:', error)
    throw new Error(`FCM V1 failed: ${response.status} - ${error}`)
  }

  const result = await response.json()
  console.log('FCM V1 Success:', result)
  return result
}

/**
 * Send notification to APNs (iOS)
 * Placeholder for future iOS implementation (Story 7.4.3)
 */
async function sendToAPNs(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>
): Promise<any> {
  // APNs implementation deferred to Story 7.4.3
  // Requires Apple Developer credentials and APNs key
  console.log('APNs not yet implemented - Story 7.4.3 deferred')
  throw new Error('APNs not yet implemented. Please complete Story 7.4.3.')
}

console.log('send-push-notification Edge Function initialized')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check for authorization header (optional but good practice to debug)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.warn('Missing Authorization header')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    let payload: NotificationPayload
    try {
      payload = await req.json()
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, title, body, data = {} } = payload

    // Validate required fields
    if (!userId || !title || !body) {
      console.error('Missing required fields:', { userId: !!userId, title: !!title, body: !!body })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing notification for userId: ${userId}`)

    // Fetch all push tokens for user
    const { data: tokens, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)

    if (tokenError) {
      console.error('Error fetching tokens:', tokenError)
      throw tokenError
    }

    if (!tokens || tokens.length === 0) {
      console.log(`No push tokens found for user: ${userId}`)
      return new Response(
        JSON.stringify({ message: 'No push tokens found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${tokens.length} push token(s) for user`)

    // Send notifications to all devices
    const results = await Promise.allSettled(
      tokens.map(async ({ token, platform }: PushToken) => {
        if (platform === 'android') {
          return await sendToFCM(token, title, body, data)
        } else if (platform === 'ios') {
          return await sendToAPNs(token, title, body, data)
        }
        throw new Error(`Unknown platform: ${platform}`)
      })
    )

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to send to device ${index + 1}:`, result.reason)
      }
    })

    console.log(`Notification summary: ${successful} sent, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: tokens.length,
        results: results.map(r => ({
          status: r.status,
          reason: r.status === 'rejected' ? r.reason?.message || String(r.reason) : 'sent'
        }))
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Set environment variable: FCM_SERVICE_ACCOUNT (Firebase service account JSON)
  3. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-push-notification' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"userId":"<uuid>","title":"Test","body":"Hello!","data":{"type":"test"}}'

  Note: Uses FCM V1 API with service account credentials for authentication
*/
