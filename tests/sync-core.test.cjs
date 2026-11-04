const test=require('node:test');
const assert=require('node:assert/strict');
const {mergeRecords,mergeState}=require('../sync-core.cjs');
test('combines independent Garmin and manual records without modifying inputs',()=>{
 const a=[{id:'intervals-1',externalId:'1',rpe:null}],b=[{id:'run-2',notes:'Long run'}];
 const before=JSON.stringify([a,b]),result=mergeRecords(a,b);
 assert.deepEqual(result.records.map(x=>x.id),['intervals-1','run-2']);
 assert.deepEqual(result.conflicts,[]);assert.equal(JSON.stringify([a,b]),before);
});
test('merging identical activity is idempotent',()=>{
 const a=[{id:'intervals-1',externalId:'1',rpe:3}];
 const once=mergeRecords(a,a),twice=mergeRecords(once.records,a);
 assert.equal(twice.records.length,1);assert.equal(twice.conflicts.length,0);
});
test('preserves filled manual annotations when remote has null',()=>{
 const a=[{id:'intervals-1',externalId:'1',rpe:5,pain:1,notes:'Good'}];
 const b=[{id:'intervals-1',externalId:'1',rpe:null,pain:null,notes:''}];
 const r=mergeRecords(a,b);assert.equal(r.records[0].rpe,5);assert.equal(r.records[0].notes,'Good');assert.equal(r.conflicts.length,0);
});
test('combines complementary annotations on matching record',()=>{
 const a=[{id:'intervals-1',rpe:null,pain:2}],b=[{id:'intervals-1',rpe:4,pain:null}];
 const r=mergeRecords(a,b);assert.equal(r.records[0].rpe,4);assert.equal(r.records[0].pain,2);assert.equal(r.conflicts.length,0);
});
test('flags competing edits and keeps local unchanged',()=>{
 const a=[{id:'intervals-1',notes:'Sore'}],b=[{id:'intervals-1',notes:'Great'}];
 const r=mergeRecords(a,b);assert.equal(r.records[0].notes,'Sore');assert.equal(r.conflicts.length,1);assert.equal(r.conflicts[0].remote.notes,'Great');
});
test('rejects legacy missing IDs rather than losing records',()=>{
 assert.throws(()=>mergeRecords([{date:'2026-11-03'}],[]),/stable ID/);
});
test('keeps local plan and settings; marks mismatches for review',()=>{
 const a={logs:[],strengthLogs:[],weeks:{w:1},settings:{goal:50},notes:'A'};
 const b={logs:[],strengthLogs:[],weeks:{w:2},settings:{goal:50},notes:'A'};
 const r=mergeState(a,b);assert.equal(r.canAutoApply,false);assert.deepEqual(r.state.weeks,{w:1});assert.equal(r.conflicts[0].collection,'weeks');
});
test('safe merge with no conflicts can be applied explicitly',()=>{
 const a={logs:[{id:'run-1'}],strengthLogs:[],weeks:{},settings:{},notes:''};
 const b={logs:[{id:'run-2'}],strengthLogs:[],weeks:{},settings:{},notes:''};
 const r=mergeState(a,b);assert.equal(r.canAutoApply,true);assert.equal(r.state.logs.length,2);
});
