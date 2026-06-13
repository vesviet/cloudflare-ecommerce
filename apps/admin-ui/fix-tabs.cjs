const fs = require('fs');
const path = require('path');

const tabsDir = path.join(__dirname, 'src', 'tabs');
const files = fs.readdirSync(tabsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(tabsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Need to add useEffect import if missing
  if (!content.includes('useEffect')) {
    content = content.replace(/import React(.*?)(?:;|\n)/, (match, p1) => {
      if (p1.includes('{')) {
        return match.replace('{', '{ useEffect,');
      } else {
        return `import React, { useEffect }${p1};`;
      }
    });
    // Fallback if no React import
    if (!content.includes('import React')) {
        if (!content.includes('useEffect')) {
             content = `import { useEffect } from 'react';\n` + content;
        }
    }
  }

  // Common pattern:
  // if (error) addToast(...)
  // if (metricsError) addToast(...)
  // We want to extract them.
  let hasChanges = false;

  const patterns = [
    {
      regex: /if \((metricsError)\) addToast\(([^;]+)\);?\n\s*if \((ordersError)\) addToast\(([^;]+)\);?/g,
      replace: `useEffect(() => {\n    if ($1) addToast($2);\n    if ($3) addToast($4);\n  }, [$1, $3, addToast]);`
    },
    {
      regex: /if \((error)\)\s*\{?\s*addToast\(([^;]+)\);?\s*\}?/g,
      replace: `useEffect(() => {\n    if ($1) addToast($2);\n  }, [$1, addToast]);`
    }
  ];

  for (const { regex, replace } of patterns) {
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
}
