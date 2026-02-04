const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Desktop\\mini-project\\ShopStyleUi change\\public\\ecommerce-html-template\\index.html';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Keep lines 1-34 (0-33 in zero-indexed)
// Resume from line 814 (813 indexed)
const cleanLines = [
    ...lines.slice(0, 34),
    ...lines.slice(813)
];

fs.writeFileSync(filePath, cleanLines.join('\n'));
console.log('Successfully cleaned index.html');
