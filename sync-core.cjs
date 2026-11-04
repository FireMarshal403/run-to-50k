/* Pure, offline-safe merge utilities. No network calls, credentials, or production integration.
 * A merge conflict is retained as a separate record for review; never silently discard.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Run50KSync=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const collections=['logs','strengthLogs'];
const clone=x=>JSON.parse(JSON.stringify(x));
const key=x=>x&&typeof x.id==='string'&&x.id.trim()?x.id:null;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function mergeRecords(local,remote){
 if(!Array.isArray(local)||!Array.isArray(remote))throw Error('Expected record arrays');
 const output=[],conflicts=[],byId=new Map();
 for(const item of local){const id=key(item);if(!id)throw Error('Record without stable ID: migration required');if(byId.has(id))throw Error('Duplicate local record ID: '+id);byId.set(id,clone(item));output.push(byId.get(id));}
 for(const item of remote){const id=key(item);if(!id)throw Error('Remote record without stable ID');const existing=byId.get(id);
  if(!existing){if(byId.has(id))throw Error('Duplicate remote record ID: '+id);const next=clone(item);byId.set(id,next);output.push(next);continue;}
  if(equal(existing,item))continue;
  // Distinct Garmin activity with same identity: retain manual annotations if only one side filled them.
  const combined=clone(existing);let unresolved=false;
  for(const field of new Set([...Object.keys(existing),...Object.keys(item)])){
   if(field==='id')continue;
   const a=existing[field],b=item[field];
   if(equal(a,b)||b===undefined)continue;
   if(a===undefined||a===null||a===''){combined[field]=clone(b);continue;}
   if(b===null||b==='')continue;
   unresolved=true;
  }
  if(unresolved){conflicts.push({id,local:clone(existing),remote:clone(item)});continue;}
  Object.assign(existing,combined);
 }
 return {records:output,conflicts};
}
function mergeState(local,remote){
 if(!local||!remote||typeof local!=='object'||typeof remote!=='object')throw Error('Invalid state');
 const merged=clone(local),conflicts=[];
 for(const name of collections){const result=mergeRecords(local[name]||[],remote[name]||[]);merged[name]=result.records;conflicts.push(...result.conflicts.map(c=>({...c,collection:name})));}
 // Plans/settings/notes require explicit resolution; do not overwrite device-local values.
 for(const name of ['weeks','settings','notes'])if(!equal(local[name],remote[name]))conflicts.push({collection:name,local:clone(local[name]??null),remote:clone(remote[name]??null)});
 return {state:merged,conflicts,canAutoApply:conflicts.length===0};
}
return {mergeRecords,mergeState};
});
