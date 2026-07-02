const fs = require('fs');
const path = require('path');

const BASE = 'src/components/views/';

function read(f) { return fs.readFileSync(path.join(BASE, f), 'utf8'); }
function write(f, c) { fs.writeFileSync(path.join(BASE, f), c, 'utf8'); }

function fix(f) {
  let c = read(f);
  const old = c;
  const changes = [];

  // ===== STEP 0: Handle compound patterns FIRST (before breaking them apart) =====

  // text-primary-foreground -> text-white (buttons on gradient backgrounds)
  c = c.replace(/text-primary-foreground/g, 'text-white');
  changes.push('text-primary-foreground');

  // bg-primary-foreground -> bg-white (rare but possible)
  c = c.replace(/bg-primary-foreground/g, 'bg-white');
  changes.push('bg-primary-foreground');

  // from-primary to-accent -> from-green-500 to-blue-500 (gradient buttons)
  c = c.replace(/from-primary to-accent/g, 'from-green-500 to-blue-500');
  changes.push('from-primary to-accent');

  // from-primary/XX to-accent/XX
  c = c.replace(/from-primary\/(\d+) to-accent\/(\d+)/g, 'from-green-500/$1 to-blue-500/$2');
  changes.push('from-primary/XX to-accent/XX');

  // bg-gradient-to-br from-primary to-accent
  c = c.replace(/bg-gradient-to-br from-primary to-accent/g, 'bg-gradient-to-br from-green-500 to-blue-500');
  changes.push('bg-gradient-to-br from-primary to-accent');

  // bg-gradient-to-r from-primary to-accent
  c = c.replace(/bg-gradient-to-r from-primary to-accent/g, 'bg-gradient-to-r from-green-500 to-blue-500');
  changes.push('bg-gradient-to-r from-primary to-accent');

  // hover:text-primary -> hover:text-green-600 dark:hover:text-green-400
  c = c.replace(/hover:text-primary(?!\w)/g, 'hover:text-green-600 dark:hover:text-green-400');
  changes.push('hover:text-primary');

  // hover:border-primary -> hover:border-green-500
  c = c.replace(/hover:border-primary(?!\w)/g, 'hover:border-green-500');
  changes.push('hover:border-primary');

  // hover:bg-primary/XX -> hover:bg-green-500/XX
  c = c.replace(/hover:bg-primary\/(\d+)/g, 'hover:bg-green-500/$1');
  changes.push('hover:bg-primary/XX');

  // ===== STEP 1: Now handle remaining simple patterns =====

  // text-primary (standalone, not -foreground, not /XX)
  c = c.replace(/text-primary(?!\w)/g, 'text-green-600 dark:text-green-400');
  changes.push('text-primary');

  // bg-primary (standalone, not /XX)
  c = c.replace(/bg-primary(?!\w)/g, 'bg-green-500');
  changes.push('bg-primary');

  // bg-primary/XX
  c = c.replace(/bg-primary\/(\d+)/g, 'bg-green-500/$1');
  changes.push('bg-primary/XX');

  // border-primary (standalone)
  c = c.replace(/border-primary(?!\w)/g, 'border-green-500');
  changes.push('border-primary');

  // border-primary/XX
  c = c.replace(/border-primary\/(\d+)/g, 'border-green-500/$1');
  changes.push('border-primary/XX');

  // from-primary (standalone)
  c = c.replace(/from-primary(?!\w)/g, 'from-green-500');
  changes.push('from-primary');

  // ring-primary/XX
  c = c.replace(/ring-primary\/(\d+)/g, 'ring-green-500/$1');
  changes.push('ring-primary/XX');

  if (c !== old) {
    write(f, c);
    const oldCount = (old.match(/text-primary|bg-primary|border-primary|from-primary|primary-foreground/g) || []).length;
    console.log(`Fixed: ${f} (${oldCount} patterns replaced)`);
    return true;
  }
  console.log(`No change: ${f}`);
  return false;
}

const files = [
  'activation-view.tsx',
  'admin-view.tsx',
  'course-detail-view.tsx',
  'courses-view.tsx',
  'dashboard-view.tsx',
  'home-view.tsx',
  'product-marketing-view.tsx',
  'script-generator-view.tsx',
  'tools-view.tsx',
  'user-ai-models.tsx',
  'workspace-view.tsx',
];

files.forEach(fix);
console.log('\nAll done!');