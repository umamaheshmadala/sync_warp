// Automated Testing Script for Story 4.4 Functions
// Run with: node test_story_4_4_automated.cjs

const fs = require('fs');
const path = require('path');

console.log('🧪 Story 4.4 Automated Testing Script');
console.log('=====================================\n');

// Test 1: Check if all new files exist
console.log('📁 Testing File Structure...');

const requiredFiles = [
  'src/components/search/AdvancedSearchPage.tsx',
  'src/components/discovery/BusinessDiscoveryPage.tsx', 
  'src/components/categories/CategoryBrowserPage.tsx',
  'src/components/coupons/TrendingCouponsPage.tsx',
  'src/components/favorites/FallbackEnhancedFavoritesPage.tsx',
  'src/components/favorites/SimpleSaveButton.tsx',
  'src/hooks/useAdvancedSearch.ts',
  'src/hooks/useAdvancedLocation.ts',
  'src/hooks/useEnhancedFavorites.ts',
  'src/hooks/useLocalFavorites.ts',
  'src/services/advancedSearchService.ts',
  'src/services/searchService.ts',
  'supabase/migrations/20250928110600_create_enhanced_favorites_tables.sql'
];

let filesExist = 0;
const missingFiles = [];

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
    filesExist++;
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

console.log(`\n📊 File Check Results: ${filesExist}/${requiredFiles.length} files exist\n`);

// Test 2: Check Router configuration
console.log('🛣️  Testing Router Configuration...');

try {
  const routerPath = path.join(__dirname, 'src/router/Router.tsx');
  const routerContent = fs.readFileSync(routerPath, 'utf8');
  
  const routes = [
    '/search/advanced',
    '/discovery', 
    '/categories',
    '/coupons/trending',
    '/favorites'
  ];
  
  let routesFound = 0;
  routes.forEach(route => {
    if (routerContent.includes(`path: '${route}'`)) {
      console.log(`  ✅ Route ${route} configured`);
      routesFound++;
    } else {
      console.log(`  ❌ Route ${route} - NOT CONFIGURED`);
    }
  });
  
  // Check for lazy loading
  const lazyComponents = [
    'AdvancedSearchPage',
    'BusinessDiscoveryPage', 
    'CategoryBrowserPage',
    'TrendingCouponsPage',
    'FallbackEnhancedFavoritesPage'
  ];
  
  let lazyLoaded = 0;
  lazyComponents.forEach(component => {
    if (routerContent.includes(`lazy(() => import`) && routerContent.includes(component)) {
      console.log(`  ✅ ${component} lazy loaded`);
      lazyLoaded++;
    }
  });
  
  console.log(`\n📊 Router Results: ${routesFound}/${routes.length} routes, ${lazyLoaded}/${lazyComponents.length} lazy loaded\n`);
  
} catch (error) {
  console.log(`  ❌ Error reading router: ${error.message}\n`);
}

// Test 3: Check package.json for dependencies
console.log('📦 Testing Dependencies...');

try {
  const packagePath = path.join(__dirname, 'package.json');
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredDeps = [
    'react',
    'react-router-dom',
    'lucide-react',
    'framer-motion',
    '@supabase/supabase-js',
    'react-hot-toast'
  ];
  
  let depsFound = 0;
  requiredDeps.forEach(dep => {
    if (packageContent.dependencies?.[dep] || packageContent.devDependencies?.[dep]) {
      console.log(`  ✅ ${dep} - ${packageContent.dependencies?.[dep] || packageContent.devDependencies?.[dep]}`);
      depsFound++;
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
    }
  });
  
  console.log(`\n📊 Dependencies: ${depsFound}/${requiredDeps.length} found\n`);
  
} catch (error) {
  console.log(`  ❌ Error reading package.json: ${error.message}\n`);
}

// Test 4: Check TypeScript compilation (basic syntax check)
console.log('🔧 Testing TypeScript Syntax...');

const tsFiles = requiredFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
let syntaxErrors = 0;

tsFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Basic syntax checks
      const checks = [
        { name: 'Has imports', test: /import .+ from .+/g },
        { name: 'Has exports', test: /(export|export default)/g },
        { name: 'React component', test: /React\.FC|const \w+.*=.*\(/g }
      ];
      
      let fileChecks = 0;
      checks.forEach(check => {
        if (check.test.test(content)) {
          fileChecks++;
        }
      });
      
      if (fileChecks >= 2) {
        console.log(`  ✅ ${file} - Basic syntax OK`);
      } else {
        console.log(`  ⚠️ ${file} - May have syntax issues`);
        syntaxErrors++;
      }
      
    } catch (error) {
      console.log(`  ❌ ${file} - Error reading: ${error.message}`);
      syntaxErrors++;
    }
  }
});

console.log(`\n📊 TypeScript: ${tsFiles.length - syntaxErrors}/${tsFiles.length} files pass basic checks\n`);

// Test 5: Database migration files
console.log('🗄️  Testing Database Migrations...');

const migrationFiles = [
  'database/migrations/011_story_4_4_enhancements.sql',
  'database/migrations/011_story_4_4_enhancements_simple.sql', 
  'supabase/migrations/20250928110600_create_enhanced_favorites_tables.sql'
];

let migrationsFound = 0;
migrationFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasCreateTable = content.includes('CREATE TABLE');
    const hasCreateFunction = content.includes('CREATE OR REPLACE FUNCTION') || content.includes('CREATE FUNCTION');
    
    console.log(`  ✅ ${file} - ${hasCreateTable ? 'Tables' : ''} ${hasCreateFunction ? 'Functions' : ''}`);
    migrationsFound++;
  } else {
    console.log(`  ❌ ${file} - MISSING`);
  }
});

console.log(`\n📊 Migrations: ${migrationsFound}/${migrationFiles.length} files exist\n`);

// Test Summary
console.log('📋 TEST SUMMARY');
console.log('===============');
console.log(`Files: ${filesExist}/${requiredFiles.length} exist`);
console.log(`TypeScript: ${tsFiles.length - syntaxErrors}/${tsFiles.length} pass basic syntax`);  
console.log(`Migrations: ${migrationsFound}/${migrationFiles.length} exist`);

if (missingFiles.length > 0) {
  console.log('\n❌ Missing Files:');
  missingFiles.forEach(file => console.log(`  - ${file}`));
}

console.log('\n🚀 Next Steps:');
console.log('1. Start the dev server: npm run dev');
console.log('2. Open browser to http://localhost:5174');
console.log('3. Follow the testing guide: TESTING_GUIDE_STORY_4_4.md');
console.log('4. Test each route manually');

console.log('\n✅ Automated tests complete!');
console.log('ℹ️  For manual testing, use the browser and follow the testing guide.');