import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple AES-256-GCM encryption using Web Crypto API
async function getKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('FINANCIAL_ENCRYPTION_KEY');
  if (!keyString) {
    throw new Error('Encryption key not configured');
  }
  
  // Derive a proper 256-bit key from the secret
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keyString),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('rugboost-financial-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  
  const key = await getKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext) return '';
  
  try {
    const key = await getKey();
    const decoder = new TextDecoder();
    
    // Decode base64 and split IV + ciphertext
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    // Return empty string for corrupted/invalid data
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data, targetUserId } = await req.json();

    // Service client for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin (for viewing other users' data)
    const { data: isAdmin } = await supabaseService.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    if (action === 'encrypt') {
      // User can only encrypt their own data
      const encryptedData: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.trim()) {
          encryptedData[key] = await encrypt(value);
        } else {
          encryptedData[key] = '';
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: encryptedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'decrypt') {
      // Verify authorization: must be data owner or admin
      const requestedUserId = targetUserId || user.id;
      
      if (requestedUserId !== user.id && !isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to decrypt this data' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log admin access for audit
      if (isAdmin && requestedUserId !== user.id) {
        console.log(`[AUDIT] Admin ${user.id} decrypted financial data for user ${requestedUserId}`);
        
        // Also log to admin_audit_logs table
        await supabaseService.from('admin_audit_logs').insert({
          admin_user_id: user.id,
          action: 'decrypt_financial_data',
          entity_type: 'profile',
          entity_id: requestedUserId,
          details: { fields: Object.keys(data) }
        });
      }

      const decryptedData: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.trim()) {
          decryptedData[key] = await decrypt(value);
        } else {
          decryptedData[key] = '';
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: decryptedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "encrypt" or "decrypt"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Financial data operation failed:', error);
    return new Response(
      JSON.stringify({ error: 'Operation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
