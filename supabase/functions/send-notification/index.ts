import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SYj2rN7nQ1WVXhFhGQxGvCnqf5wSv9bVSqC4Q0J9EBHZYnTk0tP7EXE';
const VAPID_PRIVATE_KEY = 'vXuElzPRVhJQNaUJxqgvGvRUJoVSF3EwMQyGlSQZZuc';

interface NotificationRequest {
  recipientId: string;
  title: string;
  body: string;
  url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { recipientId, title, body, url }: NotificationRequest = await req.json();

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', recipientId);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const vapidHeaders = {
      'Content-Type': 'application/json',
      'TTL': '86400',
    };

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const payload = JSON.stringify({
          title,
          body,
          url: url || '/',
        });

        try {
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              ...vapidHeaders,
              'Authorization': await generateVapidAuthHeader(
                sub.endpoint,
                VAPID_PUBLIC_KEY,
                VAPID_PRIVATE_KEY
              ),
              'Crypto-Key': `p256ecdsa=${VAPID_PUBLIC_KEY}`,
              'Content-Encoding': 'aes128gcm',
            },
            body: await encryptPayload(payload, sub.p256dh, sub.auth),
          });

          if (!response.ok && response.status === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }

          return { success: response.ok, status: response.status };
        } catch (error) {
          console.error('Push notification error:', error);
          return { success: false, error: error.message };
        }
      })
    );

    return new Response(
      JSON.stringify({
        message: 'Notifications sent',
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateVapidAuthHeader(
  endpoint: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: 'mailto:noreply@example.com',
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `vapid t=${headerB64}.${payloadB64}.${privateKey.substring(0, 32)}, k=${publicKey}`;
}

async function encryptPayload(
  payload: string,
  userPublicKey: string,
  userAuth: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  return data.buffer;
}
