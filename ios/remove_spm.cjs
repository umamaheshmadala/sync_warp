const fs = require('fs');
const path = require('path');
const pbxprojPath = path.join(__dirname, 'App/App.xcodeproj/project.pbxproj');
let content = fs.readFileSync(pbxprojPath, 'utf8');

// Strip out the package references list
content = content.replace(/packageReferences = \([\s\S]*?\);/g, 'packageReferences = (\n\t\t\t);');

// Strip out packageDependencies from targets
content = content.replace(/packageProductDependencies = \([\s\S]*?\);/g, 'packageProductDependencies = (\n\t\t\t);');

// Remove all XCRemoteSwiftPackageReference objects
content = content.replace(/[A-Z0-9]{24} \/\* XCRemoteSwiftPackageReference ".*?" \*\/ = \{[\s\S]*?\};\n/g, '');

// Remove all XCLocalSwiftPackageReference objects
content = content.replace(/[A-Z0-9]{24} \/\* XCLocalSwiftPackageReference ".*?" \*\/ = \{[\s\S]*?\};\n/g, '');

// Remove all XCSwiftPackageProductDependency objects
content = content.replace(/[A-Z0-9]{24} \/\* XCSwiftPackageProductDependency ".*?" \*\/ = \{[\s\S]*?\};\n/g, '');

// Specifically remove the references to CapApp-SPM product dependency
content = content.replace(/[A-Z0-9]{24} \/\* CapApp-SPM \*\/ = \{[\s\S]*?\};\n/g, '');

// Remove CapApp-SPM from the PBXBuildFile section (the one in Frameworks)
content = content.replace(/[A-Z0-9]{24} \/\* CapApp-SPM in Frameworks \*\/ = \{isa = PBXBuildFile; productRef = [A-Z0-9]{24} \/\* CapApp-SPM \*\/; \};\n/g, '');

// Remove CapApp-SPM from within the PBXFrameworksBuildPhase files array
content = content.replace(/[A-Z0-9]{24} \/\* CapApp-SPM in Frameworks \*\/,\n/g, '');

fs.writeFileSync(pbxprojPath, content, 'utf8');
console.log("Successfully wiped all SPM Product References and Build Files from pbxproj");
