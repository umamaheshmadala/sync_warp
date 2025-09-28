// AuthDebug.tsx - Enhanced authentication debugging component
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const AuthDebug: React.FC = () => {
  const { user } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runAuthDebug = async () => {
    setLoading(true);
    const debug: any = {
      timestamp: new Date().toISOString(),
      storeUser: null,
      session: null,
      sessionUser: null,
      rpcTest: null,
      tableTest: null,
      errors: []
    };

    try {
      // 1. Check store user
      debug.storeUser = {
        exists: !!user,
        id: user?.id,
        email: user?.email
      };

      // 2. Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      debug.session = {
        exists: !!session,
        error: sessionError?.message,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          aud: session.user.aud,
          role: session.user.role
        } : null
      };

      if (sessionError) {
        debug.errors.push(`Session error: ${sessionError.message}`);
      }

      // 3. Test RPC call if we have a session
      if (session && session.user) {
        try {
          console.log('Testing get_coupon_drafts RPC call...');
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_coupon_drafts');
          debug.rpcTest = {
            success: !rpcError,
            error: rpcError?.message,
            data: rpcData,
            dataCount: Array.isArray(rpcData) ? rpcData.length : 0
          };

          if (rpcError) {
            debug.errors.push(`RPC error: ${rpcError.message}`);
            console.error('RPC error details:', rpcError);
          }
        } catch (rpcException) {
          debug.rpcTest = {
            success: false,
            error: rpcException.message,
            exception: true
          };
          debug.errors.push(`RPC exception: ${rpcException.message}`);
          console.error('RPC exception:', rpcException);
        }

        // 4. Test direct table access
        try {
          console.log('Testing direct table access...');
          const { data: tableData, error: tableError } = await supabase
            .from('coupon_drafts')
            .select('id, user_id, business_id, draft_name')
            .limit(5);
          
          debug.tableTest = {
            success: !tableError,
            error: tableError?.message,
            dataCount: Array.isArray(tableData) ? tableData.length : 0,
            data: tableData
          };

          if (tableError) {
            debug.errors.push(`Table access error: ${tableError.message}`);
            console.error('Table access error:', tableError);
          }
        } catch (tableException) {
          debug.tableTest = {
            success: false,
            error: tableException.message,
            exception: true
          };
          debug.errors.push(`Table access exception: ${tableException.message}`);
          console.error('Table access exception:', tableException);
        }
      } else {
        debug.errors.push('No session available for testing RPC/table access');
      }

    } catch (error) {
      debug.errors.push(`Debug error: ${error.message}`);
      console.error('Debug error:', error);
    } finally {
      setLoading(false);
      setDebugInfo(debug);
      console.log('=== AUTH DEBUG COMPLETE ===');
      console.log(debug);
    }
  };

  useEffect(() => {
    runAuthDebug();
  }, [user?.id]);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      backgroundColor: 'white', 
      border: '2px solid #ccc', 
      padding: '10px', 
      maxWidth: '400px', 
      maxHeight: '80vh',
      overflow: 'auto',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <h3>🔍 Auth Debug</h3>
      
      <button 
        onClick={runAuthDebug} 
        disabled={loading}
        style={{ marginBottom: '10px' }}
      >
        {loading ? 'Testing...' : 'Run Auth Debug'}
      </button>

      {debugInfo.timestamp && (
        <>
          <div><strong>Last Run:</strong> {new Date(debugInfo.timestamp).toLocaleTimeString()}</div>
          
          <div><strong>Store User:</strong> 
            {debugInfo.storeUser.exists ? '✅' : '❌'} 
            {debugInfo.storeUser.id && ` (${debugInfo.storeUser.id})`}
          </div>
          
          <div><strong>Session:</strong> 
            {debugInfo.session.exists ? '✅' : '❌'}
            {debugInfo.session.error && ` (${debugInfo.session.error})`}
          </div>
          
          {debugInfo.session.user && (
            <div style={{ marginLeft: '10px', fontSize: '11px' }}>
              ID: {debugInfo.session.user.id}<br/>
              Email: {debugInfo.session.user.email}<br/>
              Role: {debugInfo.session.user.role}
            </div>
          )}

          <div><strong>RPC Test:</strong> 
            {debugInfo.rpcTest ? (debugInfo.rpcTest.success ? '✅' : '❌') : '⏭️'} 
            {debugInfo.rpcTest?.dataCount !== undefined && ` (${debugInfo.rpcTest.dataCount} drafts)`}
            {debugInfo.rpcTest?.error && ` - ${debugInfo.rpcTest.error}`}
          </div>

          <div><strong>Table Test:</strong> 
            {debugInfo.tableTest ? (debugInfo.tableTest.success ? '✅' : '❌') : '⏭️'} 
            {debugInfo.tableTest?.dataCount !== undefined && ` (${debugInfo.tableTest.dataCount} rows)`}
            {debugInfo.tableTest?.error && ` - ${debugInfo.tableTest.error}`}
          </div>

          {debugInfo.errors.length > 0 && (
            <div style={{ marginTop: '10px', color: 'red' }}>
              <strong>Errors:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
                {debugInfo.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#666' }}>
        Check browser console for detailed logs
      </div>
    </div>
  );
};

export default AuthDebug;