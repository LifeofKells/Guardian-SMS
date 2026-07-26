const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'CommandCenterWorkspace.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    /\{\/\* Tab strip — plain text, bold = active \(matches live site\) \*\/\}\n\s*<nav className="flex items-center gap-6">\n\s*\{\(\['overview', 'workforce', 'finance', 'risk'\] as const\)\.map\(tab => \(\n\s*<button\n\s*key=\{tab\}\n\s*onClick=\{([^}]+)\}\n\s*className=\{cn\(\n\s*'text-sm transition-colors pb-0\.5',\n\s*activeTab === tab\n\s*\? 'font-bold text-foreground border-b-2 border-foreground'\n\s*: 'font-medium text-muted-foreground hover:text-foreground'\n\s*\)\}/g,
    `{/* Tab strip */}
          <nav className="flex items-center bg-muted/60 backdrop-blur-md rounded-2xl p-1 gap-1 border border-border/50 shadow-inner">
            {(['overview', 'workforce', 'finance', 'risk'] as const).map(tab => (
              <button
                key={tab}
                onClick={$1}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all duration-300',
                  activeTab === tab
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}`
);

content = content.replace(
    /<Card className="border-border\/60 shadow-sm hover:shadow-md hover:-translate-y-0\.5 transition-all duration-300 group">/g,
    `<Card hoverLift={true} className="group overflow-hidden relative">`
);

content = content.replace(
    /<Card className="border-border\/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">/g,
    `<Card hoverLift={true} className="group overflow-hidden relative">`
);

content = content.replace(
    /<Card className=\{cn\('border-border\/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group', openIncidents\.length > 0 && 'border-red-200 dark:border-red-900\/40 shadow-red-500\/5'\)\}>/g,
    `<Card hoverLift={true} className={cn('group overflow-hidden relative transition-all duration-500', openIncidents.length > 0 && 'border-red-400 dark:border-red-900/60 shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)] ring-1 ring-red-500/30')}>`
);

content = content.replace(
    /<Card className="border-border\/60 shadow-sm hover:shadow-md transition-all duration-300">/g,
    `<Card hoverLift={true} className="overflow-hidden relative group">`
);

content = content.replace(
    /<Card className="border-border\/60 shadow-sm overflow-hidden">/g,
    `<Card className="overflow-hidden relative group">`
);

content = content.replace(
    /<Card className=\{cn\('border-border\/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group', openIncidents\.length > 0 && 'border-red-200 dark:border-red-900\/40'\)\}>/g,
    `<Card hoverLift={true} className={cn('group overflow-hidden relative transition-all duration-500', openIncidents.length > 0 && 'border-red-400 dark:border-red-900/60 shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)] ring-1 ring-red-500/30')}>`
);

content = content.replace(
    /<CardContent className="p-5">/g,
    `<CardContent className="p-6 relative z-10">`
);

content = content.replace(
    /<p className="text-3xl font-bold mt-1">/g,
    `<p className="text-4xl font-black mt-2 tracking-tight group-hover:text-primary transition-colors duration-500 delay-75">`
);

content = content.replace(
    /<p className=\{cn\('text-3xl font-bold mt-1', openIncidents\.length > 0 \? 'text-red-600' : ''\)\}>/g,
    `<p className={cn('text-4xl font-black mt-2 tracking-tight transition-colors duration-500 delay-75', openIncidents.length > 0 ? 'text-red-600' : 'group-hover:text-primary')}>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update script completely finished.');
