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

const historyCtx={};vm.createContext(historyCtx);
vm.runInContext(extract('function distanceMilestoneHistory(','const previousDashboard=dashboard;'),historyCtx);
test('milestone history uses earliest qualifying recorded run, regardless of input order',()=>{
 const milestones=historyCtx.distanceMilestoneHistory([{id:'later',date:'2026-11-03',distance:16},{id:'earlier',date:'2026-10-24',distance:15.6}]);
 assert.equal(milestones.find(x=>x.distance===15).date,'2026-10-24');
 assert.equal(milestones.find(x=>x.distance===20).date,null);
});
test('milestone history rejects invalid dates and distances',()=>{
 const milestones=historyCtx.distanceMilestoneHistory([{id:'bad',date:'not-a-date',distance:50},{id:'valid',date:'2026-11-03',distance:5}]);
 assert.equal(milestones.find(x=>x.distance===5).runId,'valid');
 assert.equal(milestones.find(x=>x.distance===10).date,null);
});
