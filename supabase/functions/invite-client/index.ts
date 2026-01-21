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

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Inviting client: ${normalizedEmail} for job ${jobId}`);

    let userId: string;
    let isNewUser = false;
    let tempPassword: string | null = null;

    // Try to create the user first - if they exist, we'll handle that error
    tempPassword = crypto.randomUUID().slice(0, 16);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        needs_password_setup: true,
      },
    });

    if (createError) {
      // Check if it's an "email exists" error
      if (createError.code === 'email_exists' || createError.message?.includes('already been registered')) {
        console.log('User already exists, fetching existing user...');
        
        // Fetch user by email using the admin API
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (listError) {
          console.error('Error listing users:', listError);
          throw listError;
        }

        const existingUser = usersData?.users?.find(
          u => u.email?.toLowerCase() === normalizedEmail
        );

        if (!existingUser) {
          // Try getUserByEmail as fallback (if available in newer SDK versions)
          throw new Error('User exists but could not be retrieved');
        }

        userId = existingUser.id;
        isNewUser = false;
        tempPassword = null;
        console.log('Found existing user:', userId);
      } else {
        console.error('Error creating user:', createError);
        throw createError;
      }
    } else {
      userId = newUser.user.id;
      isNewUser = true;
      console.log('Created new user:', userId);

      // Add client role for new users
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
      console.log('Using existing client account:', clientId);
    } else {
      // Create client account
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('client_accounts')
        .insert({
          user_id: userId,
          email: normalizedEmail,
          full_name: fullName,
        })
        .select('id')
        .single();

      if (clientError) {
        console.error('Error creating client account:', clientError);
        throw clientError;
      }
      clientId = newClient.id;
      console.log('Created new client account:', clientId);
    }

    // Link client to job access
    const { error: linkError } = await supabaseAdmin
      .from('client_job_access')
      .update({ client_id: clientId })
      .eq('access_token', accessToken);

    if (linkError) {
      console.error('Error linking client to job:', linkError);
    } else {
      console.log('Linked client to job access');
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
