const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
function extract(start,end){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return html.slice(a,b)}
const ctx={};vm.createContext(ctx);vm.runInContext(extract('function runPace(','function weeklyTrainingBrief('),ctx);
test('pace calculated from hh:mm:ss',()=>assert.equal(ctx.runPace('00:33:29',3.32),'10:05 /mi'));
test('pace calculated from mm:ss',()=>assert.equal(ctx.runPace('30:00',3),'10:00 /mi'));
test('missing duration and zero distance do not produce invented pace',()=>{assert.equal(ctx.runPace('',3),'—');assert.equal(ctx.runPace('30:00',0),'—')});
test('activity detail and weekly brief exist in app',()=>{assert.match(html,/function showActivity\(id\)/);assert.match(html,/function weeklyTrainingBrief\(\)/);assert.match(html,/View details/)});
