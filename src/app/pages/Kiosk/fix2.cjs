const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.', {recursive: true}).filter(f => f.endsWith('.tsx'));

const replacements = {
  'bg-[#2D6A4F]': 'bg-primary',
  'text-[#2D6A4F]': 'text-primary',
  'from-[#C9A441]': 'from-accent',
  'bg-[#F5F5F0]': 'bg-background',
  'to-[#2d6b4f]': 'to-primary',
  'hover:bg-[#c29f2f]': 'hover:bg-accent/80',
  'from-[#f0faf5]': 'from-background',
  'to-[#e6f5ed]': 'to-muted',
  'text-[#2d7a52]': 'text-primary'
};

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content;

  for (const [key, val] of Object.entries(replacements)) {
    newContent = newContent.split(key).join(val);
  }
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Updated ' + f);
  }
});
