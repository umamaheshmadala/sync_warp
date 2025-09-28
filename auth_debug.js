// Authentication Debug Script
// Add this to your component to debug authentication issues

const debugAuth = async () => {
  console.log('=== AUTHENTICATION DEBUG ===');
  
  // Check current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Session:', session);
  console.log('Session Error:', sessionError);
  
  if (session) {
    console.log('User ID:', session.user.id);
    console.log('User Email:', session.user.email);
    
    // Test the RPC call
    console.log('Testing get_coupon_drafts RPC call...');
    try {
      const { data, error } = await supabase.rpc('get_coupon_drafts');
      console.log('RPC Success:', data);
      console.log('RPC Error:', error);
    } catch (err) {
      console.error('RPC Exception:', err);
    }
    
    // Test direct table access (should be blocked by RLS if not authenticated)
    console.log('Testing direct table access...');
    try {
      const { data, error } = await supabase
        .from('coupon_drafts')
        .select('*')
        .limit(5);
      console.log('Table Access Success:', data);
      console.log('Table Access Error:', error);
    } catch (err) {
      console.error('Table Access Exception:', err);
    }
  } else {
    console.log('No session found - user is not authenticated');
  }
  
  console.log('=== END DEBUG ===');
};

// Call this in your component
debugAuth();