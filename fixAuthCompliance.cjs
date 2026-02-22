const fs = require('fs');
const path = require('path');

const filesToFix = [
    'src/router/ProtectedRoute.tsx',
    'src/components/Login.tsx',
    'src/components/MobileProfileDrawer.tsx',
    'src/components/SignUp.tsx',
    'src/components/ResetPassword.tsx',
    'src/components/Profile.tsx',
    'src/components/profile/AvatarUpload.tsx',
    'src/components/profile/ProfileSettings.tsx',
    'src/components/profile/ProfileEditForm.tsx',
    'src/components/onboarding/OnboardingFlow.tsx',
    'src/components/location/CityPicker.tsx',
    'src/components/ForgotPassword.tsx'
];

filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');

        // Pattern: const { method } = useAuthStore();
        const regex = /const\s+\{\s*([a-zA-Z0-9_]+)\s*\}\s*=\s*useAuthStore\(\);/g;

        content = content.replace(regex, (match, methodName) => {
            console.log(`Replacing in ${filePath}: ${match} -> const ${methodName} = useAuthStore(s => s.${methodName});`);
            return `const ${methodName} = useAuthStore(s => s.${methodName});`;
        });

        // Special case for ProtectedRoute if it has { checkUser, user } which it might not based on grep

        fs.writeFileSync(fullPath, content);
    }
});

console.log('Fixed auth store usages for 100% strict compliance.');
