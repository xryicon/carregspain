import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const dictionaries=['nl','fr','de'].map(lang=>({lang,data:JSON.parse(fs.readFileSync(`lib/locales/${lang}.json`,'utf8'))}));
const expected=new Set();
function strings(node){if(ts.isStringLiteral(node)&&/[A-Za-z]/.test(node.text)&&!node.text.startsWith('#'))expected.add(node.text);else if(ts.isConditionalExpression(node)){strings(node.whenTrue);strings(node.whenFalse);}else if(ts.isElementAccessExpression(node))strings(node.expression);else if(ts.isArrayLiteralExpression(node))node.elements.forEach(strings);}
for(const file of ['components/carreg-website.tsx','components/quote-form.tsx','components/enquiry-inbox.tsx','components/privacy-content.tsx','components/owner-gate.tsx','components/language.tsx','app/layout.tsx','app/api/quotes/route.ts','app/api/admin/route.ts','lib/i18n.ts','lib/quotes.ts']){
 const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function walk(n){
  if(ts.isCallExpression(n)&&n.expression.getText(sf)==='t'&&n.arguments[0])strings(n.arguments[0]);
  if(ts.isCallExpression(n)&&['field','select'].includes(n.expression.getText(sf))){strings(n.arguments[1]);if(n.expression.getText(sf)==='select'){strings(n.arguments[2]);if(n.arguments[3])strings(n.arguments[3]);}}
  if(ts.isVariableDeclaration(n)&&['services','faqs','nav','steps','COUNTRIES','TYPES','FUELS','PURPOSES','STATUSES'].includes(n.name.getText(sf))){function nested(v){if(ts.isPropertyAssignment(v)&&['title','text','tag','label'].includes(v.name.getText(sf)))strings(v.initializer);else if(ts.isArrayLiteralExpression(v))v.elements.forEach(nested);else if(ts.isStringLiteral(v))strings(v);else ts.forEachChild(v,nested);}if(n.initializer)nested(n.initializer);}
  if(ts.isPropertyAssignment(n)&&['label','placeholder','help','error'].includes(n.name.getText(sf)))strings(n.initializer);
  if(ts.isArrayLiteralExpression(n)&&n.elements.length>0&&ts.isStringLiteral(n.elements[0])&&n.parent&&ts.isArrayLiteralExpression(n.parent)&&n.elements.length===2)strings(n.elements[0]);
  if(ts.isJsxText(n)&&/[A-Za-z]/.test(n.text.trim()))assert.ok(['CARREG','SPAIN','CARREG SPAIN','WhatsApp'].includes(n.text.trim()),`${file}: untranslated JSX text ${n.text.trim()}`);
  ts.forEachChild(n,walk);
 }
 walk(sf);
}
for(const {lang,data}of dictionaries){for(const key of expected)assert.ok(data[key]?.trim(),`${lang}: missing ${JSON.stringify(key)}`);for(const [key,value]of Object.entries(data)){const placeholders=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();assert.deepEqual(placeholders(value),placeholders(key),`${lang}: interpolation mismatch for ${key}`);}}
assert.deepEqual(Object.keys(dictionaries[0].data).sort(),Object.keys(dictionaries[1].data).sort());
assert.deepEqual(Object.keys(dictionaries[0].data).sort(),Object.keys(dictionaries[2].data).sort());
console.log(`Translation coverage: ${expected.size} UI keys, ${Object.keys(dictionaries[0].data).length} entries per language, all placeholders match.`);
