import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const dir = 'dist-webpack';
const html = fs.readFileSync(`${dir}/index.html`, 'utf8');
const bundle = fs.readFileSync(`${dir}/main.js`, 'utf8');

const errors = [];
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'dangerously' });
dom.virtualConsole.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.message || e)));
dom.window.addEventListener('error', (e) => errors.push('window.error: ' + (e.error?.message || e.message)));

try {
  dom.window.eval(bundle);
} catch (e) {
  errors.push('exec threw: ' + e.message);
}

await new Promise((r) => setTimeout(r, 500));

const doc = dom.window.document;
const root = doc.querySelector('#root') || doc.body;
const text = (root.textContent || '').replace(/\s+/g, ' ').trim();
const buttons = doc.querySelectorAll('button').length;

console.log('--- jsdom 执行结果 ---');
console.log('root 子节点数 :', root.children.length);
console.log('可见文本长度 :', text.length);
console.log('文本摘录     :', text.slice(0, 160));
console.log('button 数量  :', buttons);
console.log('错误条数     :', errors.length);
errors.slice(0, 5).forEach((e) => console.log('  !', e));

const ok = root.children.length > 0 && text.length > 20 && errors.length === 0;
console.log(ok ? 'SMOKE-PASS (bundle 可执行且渲染出内容)' : 'SMOKE-FAIL');
process.exit(ok ? 0 : 1);
