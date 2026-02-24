const fs = require('fs');
const contents = JSON.parse(fs.readFileSync('ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json', 'utf8'));
contents.images.forEach(img => {
    if (img.filename) {
        fs.writeFileSync('ios/App/App/Assets.xcassets/AppIcon.appiconset/' + img.filename, 'fake png data');
    }
});
