import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  fullName: string;
  jobId: string;
  accessToken: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, fullName, jobId, accessToken } = await req.json() as InviteRequest;

    if (!email || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Email and access token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Inviting client: ${email} for job ${jobId}`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;
    let isNewUser = false;
    let tempPassword: string | null = null;

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Generate a temporary password (client will be required to change it)
      tempPassword = crypto.randomUUID().slice(0, 16);
      
      // Create the user with admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          full_name: fullName,
          needs_password_setup: true, // Flag to show password setup screen
        },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log('Created new user:', userId);

      // Add client role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'client' });

      if (roleError && roleError.code !== '23505') {
        console.error('Error adding role:', roleError);
      }
    }

    // Check if client account exists
    const { data: existingClient } = await supabaseAdmin
      .from('client_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let clientId: string;

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      // Create client account
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('client_accounts')
        .insert({
          user_id: userId,
          email,
          full_name: fullName,
        })
        .select('id')
        .single();

      if (clientError) {
        console.error('Error creating client account:', clientError);
        throw clientError;
      }
      clientId = newClient.id;
    }

    // Link client to job access
    const { error: linkError } = await supabaseAdmin
      .from('client_job_access')
      .update({ client_id: clientId })
      .eq('access_token', accessToken);

    if (linkError) {
      console.error('Error linking client to job:', linkError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        clientId,
        isNewUser,
        tempPassword: isNewUser ? tempPassword : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Invite client error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to invite client';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});