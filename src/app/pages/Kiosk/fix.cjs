const fs = require('fs');
const glob = require('glob');

const files = fs.readdirSync('.', {recursive: true}).filter(f => f.endsWith('.tsx'));

const replacements = {
  'bg-[#1F4D3A]': 'bg-primary',
  'text-[#1F4D3A]': 'text-primary',
  'border-[#1F4D3A]': 'border-primary',
  'ring-[#1F4D3A]': 'ring-primary',
  'from-[#1F4D3A]': 'from-primary',
  
  'bg-[#F0F4F1]': 'bg-background',
  'from-[#F0F4F1]': 'from-background',
  'to-[#F0F4F1]': 'to-background',
  
  'text-[#3CB371]': 'text-primary',
  'bg-[#3CB371]': 'bg-primary',
  'border-[#3CB371]': 'border-primary',
  
  'text-[#D4AF37]': 'text-accent',
  'border-[#D4AF37]': 'border-accent',
  'bg-[#D4AF37]': 'bg-accent',
  
  'text-[#C9A441]': 'text-accent',
  'border-[#C9A441]': 'border-accent',
  'bg-[#C9A441]': 'bg-accent',
  
  'bg-[#153428]': 'bg-secondary',
  'from-[#153428]': 'from-secondary',
  'to-[#153428]': 'to-secondary',
  
  'bg-[#2d8f5e]': 'bg-muted',
  'from-[#2d8f5e]': 'from-muted',
  'to-[#2d8f5e]': 'to-muted'
};

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content;
  
  if(f.includes('IdlePage.tsx')) {
    newContent = newContent.replace(/\['#1F4D3A', '#153428', '#2d8f5e'\]/g, '[\`var(--primary)\`, \`var(--secondary)\`, \`var(--muted)\`]');
  }

  for (const [key, val] of Object.entries(replacements)) {
    newContent = newContent.split(key).join(val);
  }
  
  // Also blindly replace `#1F4D3A` in some inline styles if they exist?
  // Let's rely on tailwind classes first.
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Updated ' + f);
  }
});
