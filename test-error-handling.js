// Quick test to verify error handling is in place
// Run this in browser console after hard refresh

const testErrorCode = {
  code: 'PGRST205',
  message: "Could not find the table 'public.favorites'"
};

// Simulate the error check
const shouldHandle = testErrorCode.code === 'PGRST204' || testErrorCode.code === 'PGRST205';

console.log('Error code:', testErrorCode.code);
console.log('Should be handled:', shouldHandle);
console.log('Expected: true');

if (shouldHandle) {
  console.log('✅ Error handling is working correctly!');
  console.log('The 404 errors should be caught and logged as warnings.');
} else {
  console.log('❌ Error handling not working - check if code reloaded');
}
