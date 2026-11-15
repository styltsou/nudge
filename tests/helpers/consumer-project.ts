import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Temporary test input, not a runnable demo distributed with Nudge. */
export function createConsumerProject(root: string, archive?: string) {
  mkdirSync(root, { recursive: true });
  writeFileSync(
    resolve(root, 'vite.config.ts'),
    "export default { server: { host: '127.0.0.1', port: 0 } };\n",
  );
  writeFileSync(
    resolve(root, 'package.json'),
    JSON.stringify(
      {
        private: true,
        type: 'module',
        scripts: { dev: 'vite --host 127.0.0.1', build: 'vite build' },
        devDependencies: {
          vite: `link:${resolve('node_modules/vite').replaceAll('\\', '/')}`,
          ...(archive ? { usenudge: archive.replaceAll('\\', '/') } : {}),
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    resolve(root, 'index.html'),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><title>Consumer fixture</title></head><body><main><button id="publish">Publish</button><button data-testid="normal-control">Clicked 0 times</button><section data-testid="analytics-chart">Activity chart</section><article data-testid="revenue-card">Monthly revenue</article></main><script type="module" src="/app.js"></script></body></html>`,
  );
  writeFileSync(
    resolve(root, 'styles.css'),
    'body{font-family:system-ui;margin:0;padding:32px}main{max-width:800px;margin:auto}button{padding:6px 10px;color:white;background:#333;border:0}section{margin-top:24px;min-height:260px;padding:24px;background:#dbeafe}article{margin-top:24px;padding:24px;background:#eef2ff}',
  );
  writeFileSync(
    resolve(root, 'app.js'),
    `let count=0; const button=document.querySelector('[data-testid="normal-control"]');button.addEventListener('click',()=>{button.textContent='Clicked '+(++count)+' times'});`,
  );
}
