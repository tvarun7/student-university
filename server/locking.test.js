import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
process.env.TEST_DB='true';process.env.NODE_ENV='test';
const {assigned,attendanceInput,saveAttendance}=await import('./upgrade.js');
const {db}=await import('./db.js');
after(async()=>db.close());
function authorizationTx({assignments=[{batch_id:'b',staff_id:'teacher'}],legacy=null,student={id:'s',batch_id:'b'}}={}){
 const calls=[];return {calls,query:async(sql,args)=>{calls.push({sql,args});if(sql.startsWith('SELECT * FROM courses'))return {rows:[{id:'c',staff_id:legacy,components:[{key:'exam',label:'Exam',max:20}]}]};if(sql.includes('FROM users u JOIN enrollments'))return {rows:student?[student]:[]};if(sql.includes('FROM course_assignments'))return {rows:assignments};throw Error('Unexpected query: '+sql);}};
}
test('individual authorization holds course then student/enrollment then assignment SHARE locks',async()=>{
 const tx=authorizationTx();const c=await assigned({user:{id:'teacher'}},'s','c',tx);assert.equal(c.components[0].max,20);
 assert.equal(tx.calls.length,3);assert.ok(tx.calls[0].sql.endsWith('FROM courses WHERE id=$1 FOR SHARE'));assert.match(tx.calls[1].sql,/FOR SHARE OF u,e$/);assert.ok(tx.calls[2].sql.endsWith('FROM course_assignments WHERE course_id=$1 FOR SHARE'));
 assert.deepEqual(tx.calls.map(q=>q.args),[['c'],['s','c'],['c']]);
});
test('individual authorization rechecks current assignment and membership; legacy only with no assignments',async()=>{
 const req={user:{id:'teacher'}};
 for(const config of [{assignments:[{batch_id:'b',staff_id:'replacement'}],legacy:'teacher'},{student:{id:'s',batch_id:'other'}},{student:null}])await assert.rejects(assigned(req,'s','c',authorizationTx(config)),e=>e.status===403);
 assert.equal((await assigned(req,'s','c',authorizationTx({assignments:[],legacy:'teacher'}))).id,'c');
 await assert.rejects(assigned(req,'s','c',authorizationTx({assignments:[],legacy:null})),e=>e.status===403);
});
test('single attendance reads slot and writes snapshot on supplied transaction, never db',async()=>{
 const calls=[],slot={id:25,start_time:'18:00',end_time:'19:00'};const tx={query:async(sql,args)=>{calls.push({sql,args});return {rows:sql.startsWith('SELECT')?[slot]:[]};}};
 const att=await attendanceInput({date:'2026-01-01',slot:25},tx);await saveAttendance('s','c',att.d,att.slot,true,tx);
 assert.match(calls[0].sql,/active=true FOR SHARE$/);assert.match(calls[1].sql,/INSERT INTO attendance/);assert.deepEqual(calls[1].args,['s','c','2026-01-01',25,true,'18:00','19:00']);
 await assert.rejects(attendanceInput({date:'2026-01-01',slot:25},{query:async()=>({rows:[]})}),e=>e.status===400);
});
test('route transaction boundaries and course-first admin mutations remain reproducible',async()=>{
 const app=await readFile(new URL('./app.js',import.meta.url),'utf8'),upgrade=await readFile(new URL('./upgrade.js',import.meta.url),'utf8');
 for(const [start,end] of [["api.put('/marks',","api.post('/attendance',"],["api.post('/attendance',","api.get('/feedback'"]]){
  const route=app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));assert.ok(route.includes('await academicWrite(req,sid,cid,async'));assert.doesNotMatch(route,/await db.query/);
 }
 assert.ok(upgrade.includes('academicWrite(req,sid,cid,write){return transaction(async tx=>write(tx,await assigned(req,sid,cid,tx)));}'));
 for(const method of ['post','put','delete']){
  const start=upgrade.indexOf("api."+method+"('/course-assignments"),end=upgrade.indexOf("res.json({ok:true});});",start);
  const route=upgrade.slice(start,method==='post'?upgrade.indexOf("api.put('/course-assignments",start):end);
  assert.ok(route.indexOf('FOR UPDATE')>=0);const mutation=method==='post'?'INSERT INTO course_assignments':method==='put'?'UPDATE course_assignments SET':'DELETE FROM course_assignments';assert.ok(route.indexOf('FOR UPDATE')<route.indexOf(mutation),method+' must lock course before changing assignment');
 }
 const bulk=upgrade.slice(upgrade.indexOf("for(const kind of ['marks','attendance'])"),upgrade.indexOf("api.get('/attendance-slots'"));assert.ok(bulk.includes('SELECT * FROM attendance_slots WHERE id=$1 AND active=true FOR SHARE'));assert.ok(upgrade.includes('await lockCourse(tx,b.course_id)'));
});
