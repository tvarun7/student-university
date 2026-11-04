import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
process.env.DATABASE_URL='postgresql://invalid-test-only:invalid@127.0.0.1:1/do-not-connect';process.env.TEST_DB='true';process.env.NODE_ENV='test';process.env.SESSION_SECRET='test-secret-not-used-outside-test-process-123';process.env.AI_ENABLED='false';
const {app}=await import('./app.js');const {db,pool}=await import('./db.js');const {seed}=await import('./seed.js');
let data,admin,staff,student,parent,otherStaff,otherStudent;
async function login(username){const agent=request.agent(app);let r=await agent.get('/api/auth/session');const u=data.users[username];r=await agent.post('/api/auth/login').set('X-CSRF-Token',r.body.csrfToken).send({username,password:u.password,role:u.role});assert.equal(r.status,200);return {agent,token:r.body.csrfToken,user:r.body.user};}
const write=(client,method,url,body)=>client.agent[method](url).set('X-CSRF-Token',client.token).send(body);
before(async()=>{data=await seed({writeCredentials:false});admin=await login('admin.demo');staff=await login('staff.demo');student=await login('student.demo');parent=await login('parent.demo');otherStaff=await login('staff.other');otherStudent=await login('student.other');});
after(async()=>await db.close());
test('anonymous academic data blocked',async()=>assert.equal((await request(app).get('/api/records')).status,401));
test('login requires CSRF',async()=>assert.equal((await request(app).post('/api/auth/login').send({username:'admin.demo',password:'x',role:'admin'})).status,403));
test('wrong role cannot elevate identity',async()=>{const a=request.agent(app),s=await a.get('/api/auth/session');const r=await a.post('/api/auth/login').set('X-CSRF-Token',s.body.csrfToken).send({username:'student.demo',password:data.users['student.demo'].password,role:'admin'});assert.equal(r.status,401);});
test('student only sees own marks',async()=>{const r=await student.agent.get('/api/records');assert.equal(r.status,200);assert.equal(r.body.student.id,student.user.id);assert.equal(r.body.courses.length,6);});
test('cross-student read denied',async()=>assert.equal((await student.agent.get('/api/records').query({studentId:otherStudent.user.id})).status,403));
test('parent scoped to linked child',async()=>{const r=await parent.agent.get('/api/records');assert.equal(r.status,200);assert.equal(r.body.student.id,student.user.id);assert.equal((await parent.agent.get('/api/records').query({studentId:otherStudent.user.id})).status,403);});
test('student and parent cannot list users',async()=>{for(const c of [student,parent])assert.equal((await c.agent.get('/api/users')).status,403);});
test('student cannot modify marks',async()=>assert.equal((await write(student,'put','/api/marks',{student_id:student.user.id,course_id:data.courses[0],marks:{project:20}})).status,403));
test('parent cannot modify attendance or feedback',async()=>{for(const route of ['/api/attendance','/api/feedback'])assert.equal((await write(parent,'post',route,{})).status,403);});
test('staff cannot edit other faculty course',async()=>{const r=await write(staff,'put','/api/marks',{student_id:student.user.id,course_id:data.courses[5],marks:{mid:10}});assert.equal(r.status,403);});
test('staff cannot edit user directory',async()=>assert.equal((await write(staff,'put','/api/users/'+student.user.id,{name:'hacked'})).status,403));
test('CSRF required for academic writes',async()=>assert.equal((await staff.agent.put('/api/marks').send({})).status,403));
test('mark component maxima and unknown keys validated',async()=>{for(const marks of [{project:21},{unknown:5},{project:-1},{project:'10'}])assert.equal((await write(staff,'put','/api/marks',{student_id:student.user.id,course_id:data.courses[0],marks})).status,400);});
test('staff mark entry persisted and unassessed kept null',async()=>{assert.equal((await write(staff,'put','/api/marks',{student_id:student.user.id,course_id:data.courses[0],marks:{project:19,lab1:null}})).status,200);const r=await student.agent.get('/api/records');const c=r.body.courses.find(c=>c.id===data.courses[0]);assert.equal(c.marks.project,19);assert.equal(c.marks.lab1,null);});
test('attendance upsert does not double count',async()=>{const body={student_id:student.user.id,course_id:data.courses[0],date:'2026-01-02',slot:2,present:true};assert.equal((await write(staff,'post','/api/attendance',body)).status,200);assert.equal((await write(staff,'post','/api/attendance',{...body,present:false})).status,200);const r=await student.agent.get('/api/records').query({from:'2026-01-02',to:'2026-01-02'});const c=r.body.courses.find(c=>c.id===data.courses[0]);assert.equal(c.attendance.held,1);assert.equal(c.attendance.present,0);});
test('invalid attendance dates and slots rejected',async()=>{for(const extra of [{date:'2099-01-01'},{date:'2026-02-31'},{slot:0},{present:'true'}])assert.equal((await write(staff,'post','/api/attendance',{student_id:student.user.id,course_id:data.courses[0],date:'2026-01-02',slot:1,present:true,...extra})).status,400);});
test('feedback reaches only relevant teaching faculty',async()=>{assert.equal((await write(student,'post','/api/feedback',{course_id:data.courses[0],rating:4,comment:'Useful explanations and practice sessions.'})).status,200);assert.equal((await staff.agent.get('/api/feedback')).body.length,1);assert.equal((await otherStaff.agent.get('/api/feedback')).body.length,0);assert.equal((await otherStudent.agent.get('/api/feedback')).body.length,0);});
test('parent has no feedback or assistant access',async()=>{assert.equal((await parent.agent.get('/api/feedback')).status,403);assert.equal((await write(parent,'post','/api/assistant',{question:'Show marks'})).status,403);});
test('local assistant honestly identifies rule-based mode',async()=>{const r=await write(student,'post','/api/assistant',{question:'How can I improve?'});assert.equal(r.status,200);assert.equal(r.body.mode,'local');assert.match(r.body.answer,/not generative AI/);});
test('admin creates edits and deactivates student',async()=>{let r=await write(admin,'post','/api/users',{username:'new.demo',name:'New Student',role:'student',password:'sample-test-password-123',department:'CSE',semester:'1-1'});assert.equal(r.status,201);const uid=r.body.id;r=await write(admin,'put','/api/users/'+uid,{name:'Updated Student'});assert.equal(r.body.name,'Updated Student');assert.equal((await write(admin,'delete','/api/users/'+uid,{})).status,200);const users=(await admin.agent.get('/api/users')).body;assert.equal(users.find(u=>u.id===uid).active,false);assert.ok(!JSON.stringify(users).includes('password_hash'));});
test('admin cannot create an admin via general user API',async()=>assert.equal((await write(admin,'post','/api/users',{username:'bad',name:'Bad',role:'admin',password:'sample-test-password-123'})).status,400));
test('deactivation blocks existing signed-in account',async()=>{assert.equal((await write(admin,'delete','/api/users/'+otherStudent.user.id,{})).status,200);assert.equal((await otherStudent.agent.get('/api/records')).status,401);});
test('date range ordering validated',async()=>assert.equal((await student.agent.get('/api/records').query({from:'2026-02-01',to:'2026-01-01'})).status,400));
test('security response headers present',async()=>{const r=await student.agent.get('/api/courses');assert.ok(r.headers['content-security-policy']);assert.equal(r.headers['x-content-type-options'],'nosniff');assert.equal(r.headers['cache-control'],'no-store');});

test('admin course creation assignment and enrollment',async()=>{const r=await write(admin,'post','/api/courses',{code:'EXTRA101',name:'Extra Demo Course',staff_id:staff.user.id,semester:'2-1',components:[{key:'exam',label:'Exam',max:100}]});assert.equal(r.status,201);const cid=r.body.id;assert.equal((await write(admin,'post','/api/enrollments',{course_id:cid,student_id:student.user.id})).status,200);assert.equal((await write(admin,'post','/api/enrollments',{course_id:cid,student_id:student.user.id})).status,200);assert.equal((await write(admin,'put','/api/courses/'+cid,{staff_id:otherStaff.user.id,name:'Reassigned Course'})).status,200);assert.equal((await write(staff,'put','/api/marks',{student_id:student.user.id,course_id:cid,marks:{exam:50}})).status,403);});
test('invalid parent child link rejected',async()=>assert.equal((await write(admin,'post','/api/users',{username:'invalid.parent',name:'Parent',role:'parent',password:'sample-test-password-123',child_id:staff.user.id})).status,400));
test('external AI requires consent before network request',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('No network request allowed without consent');};process.env.AI_ENABLED='true';process.env.GEMINI_API_KEY='test-placeholder-not-a-real-key';process.env.GEMINI_MODEL='test-model';try{const r=await write(student,'post','/api/assistant',{question:'Help me improve',consent:false});assert.equal(r.status,400);assert.match(r.body.error,/Consent/);}finally{globalThis.fetch=original;process.env.AI_ENABLED='false';delete process.env.GEMINI_API_KEY;delete process.env.GEMINI_MODEL;}});
test('non-admin cannot create course or enrollment',async()=>{for(const route of ['/api/courses','/api/enrollments'])assert.equal((await write(staff,'post',route,{})).status,403);});

test('AI adapter sends scoped academic data without identity and returns provider text',async()=>{const original=globalThis.fetch;let payload;process.env.AI_ENABLED='true';process.env.GEMINI_API_KEY='test-placeholder-not-a-real-key';process.env.GEMINI_MODEL='test-model';globalThis.fetch=async(url,options)=>{assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');assert.equal(options.headers['x-goog-api-key'],'test-placeholder-not-a-real-key');assert.ok(!url.includes('key='));payload=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'Practice the lowest-scoring assessed topics.'}]}}]})};};try{const r=await write(student,'post','/api/assistant',{question:'Help me study',consent:true});assert.equal(r.status,200);assert.equal(r.body.mode,'ai');const recordPayload=JSON.parse(payload.contents[0].parts[0].text);assert.ok(recordPayload.records.length>0);assert.ok(!payload.contents[0].parts[0].text.includes(student.user.id));assert.ok(!payload.contents[0].parts[0].text.includes('Alex Student'));assert.ok(!payload.contents[0].parts[0].text.includes('Sam Student'));assert.ok(!('tools' in payload));}finally{globalThis.fetch=original;process.env.AI_ENABLED='false';delete process.env.GEMINI_API_KEY;delete process.env.GEMINI_MODEL;}});


test('TEST_DB ignores an external DATABASE_URL and uses isolated PGlite',async()=>{
 assert.equal(pool,null);
 assert.equal((await db.query('SELECT 1 AS value')).rows[0].value,1);
});

test('login preserves password whitespace at creation and after password change',async()=>{
 const username='whitespace.password',password='  boundary-password-123  ';
 assert.equal((await write(admin,'post','/api/users',{username,name:'Password Test',role:'student',password})).status,201);
 async function signIn(value){const agent=request.agent(app),session=await agent.get('/api/auth/session');const response=await agent.post('/api/auth/login').set('X-CSRF-Token',session.body.csrfToken).send({username,password:value,role:'student'});return {agent,response};}
 let signed=await signIn(password);assert.equal(signed.response.status,200);
 assert.equal((await signIn(password.trim())).response.status,401);
 const nextPassword=' '.repeat(12);
 assert.equal((await write({agent:signed.agent,token:signed.response.body.csrfToken},'post','/api/auth/password',{currentPassword:password,newPassword:nextPassword})).status,200);
 assert.equal((await signed.agent.get('/api/records')).status,401);
 assert.equal((await signIn(nextPassword)).response.status,200);
});

test('login rejects empty non-string and overlength passwords',async()=>{
 const agent=request.agent(app),session=await agent.get('/api/auth/session');
 for(const password of ['',123,'x'.repeat(129)])assert.equal((await agent.post('/api/auth/login').set('X-CSRF-Token',session.body.csrfToken).send({username:'student.demo',password,role:'student'})).status,400);
});

test('existing feedback follows current course assignment',async()=>{
 const courseId=data.courses[0];
 const before=(await staff.agent.get('/api/feedback')).body;assert.ok(before.length>0);
 const feedbackId=before[0].id;
 assert.equal((await write(admin,'put','/api/courses/'+courseId,{staff_id:otherStaff.user.id})).status,200);
 try{
  const former=await staff.agent.get('/api/feedback'),current=await otherStaff.agent.get('/api/feedback');
  assert.equal(former.status,200);assert.equal(current.status,200);
  assert.ok(!former.body.some(f=>f.id===feedbackId));assert.ok(current.body.some(f=>f.id===feedbackId));
 }finally{assert.equal((await write(admin,'put','/api/courses/'+courseId,{staff_id:staff.user.id})).status,200);}
});

test('malformed assessment components return validation errors',async()=>{
 for(const component of [null,[],42,'invalid']){
  const r=await write(admin,'post','/api/courses',{code:'INVALID-COMPONENT',name:'Invalid Component',staff_id:staff.user.id,semester:'2-1',components:[component]});
  assert.equal(r.status,400);assert.equal(r.body.error,'Invalid assessment component');
 }
});


test('Gemini rejects provider failures and empty responses without local fallback',async()=>{
 const original=globalThis.fetch;process.env.AI_ENABLED='true';process.env.GEMINI_API_KEY='test-placeholder-not-a-real-key';process.env.GEMINI_MODEL='test-model';
 try{
  for(const response of [{ok:false},{ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[]}}]})}]){
   globalThis.fetch=async()=>response;
   const r=await write(student,'post','/api/assistant',{question:'Help me study',consent:true});
   assert.equal(r.status,502);assert.ok(!r.body.answer);assert.ok(!JSON.stringify(r.body).includes(process.env.GEMINI_API_KEY));
  }
 }finally{globalThis.fetch=original;process.env.AI_ENABLED='false';delete process.env.GEMINI_API_KEY;delete process.env.GEMINI_MODEL;}
});
test('Gemini remains student-only and requires CSRF',async()=>{
 for(const client of [admin,staff,parent])assert.equal((await write(client,'post','/api/assistant',{question:'Help',consent:true})).status,403);
 assert.equal((await request(app).post('/api/assistant').send({question:'Help',consent:true})).status,403);
 assert.equal((await student.agent.post('/api/assistant').send({question:'Help',consent:true})).status,403);
});
