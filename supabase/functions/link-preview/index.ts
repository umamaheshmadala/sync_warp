// Supabase Edge Function for fetching Open Graph metadata
// Deploy with: supabase functions deploy link-preview

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auth-flow, x-client-platform',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching Open Graph metadata for:', url)

    // Fetch the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SyncBot/1.0; +https://sync.app)'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()

    // Extract Open Graph metadata using regex
    const getMetaContent = (property: string): string | null => {
      // Try og: prefix first
      const ogRegex = new RegExp(`<meta\\s+property=["']og:${property}["']\\s+content=["']([^"']+)["']`, 'i')
      const ogMatch = html.match(ogRegex)
      if (ogMatch) return ogMatch[1]

      // Try name attribute
      const nameRegex = new RegExp(`<meta\\s+name=["']${property}["']\\s+content=["']([^"']+)["']`, 'i')
      const nameMatch = html.match(nameRegex)
      if (nameMatch) return nameMatch[1]

      return null
    }

    // Extract title from <title> tag if og:title not found
    const getTitleFromTag = (): string | null => {
      const titleRegex = /<title>([^<]+)<\/title>/i
      const match = html.match(titleRegex)
      return match ? match[1].trim() : null
    }

    const hostname = new URL(url).hostname
    const title = getMetaContent('title') || getTitleFromTag() || hostname
    const description = getMetaContent('description') || ''
    const image = getMetaContent('image') || ''
    const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`

    const preview = {
      url,
      title,
      description,
      image,
      favicon
    }

    console.log('Successfully extracted metadata:', preview)

    return new Response(
      JSON.stringify(preview),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching link preview:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
