const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/app.ts'),'utf8').replace(/^import .*$/gm,'').replace('export class AppComponent','class AppComponent');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
const App=vm.runInNewContext(js+'; AppComponent',{Component:()=>target=>target,CommonModule:{},FormsModule:{},fetch,URLSearchParams,window:{confirm:()=>true,print:()=>{}}});
function setup(){const app=new App();const calls=[];app.run=async(fn)=>fn();app.load=async()=>{};app.api=async(path,method,body)=>{calls.push({path,method,body});return {};};return {app,calls};}
test('new user and course defaults use string academic semesters',()=>{const {app}=setup();assert.equal(app.userForm.semester,'2-1');assert.equal(app.courseForm.semester,'2-1');});
test('create user sends string semester',async()=>{const {app,calls}=setup();app.userForm.name='Fictional Test';app.userForm.semester='3-2';await app.saveUser();assert.equal(calls[0].path,'/users');assert.equal(calls[0].method,'POST');assert.equal(calls[0].body.semester,'3-2');});
test('edit user preserves semester string and supports reactivation',async()=>{const {app,calls}=setup();app.editUser({id:'user-test',name:'Fictional Test',username:'fictional.test',role:'student',department:'Demo',semester:'2-1',child_id:null,active:false});app.userForm.semester='3-1';app.userForm.active=true;await app.saveUser();assert.equal(calls[0].path,'/users/user-test');assert.equal(calls[0].method,'PUT');assert.equal(calls[0].body.semester,'3-1');assert.equal(calls[0].body.active,true);});
test('create course sends string semester and scheme',async()=>{const {app,calls}=setup();app.courseForm={code:'TEST101',name:'Fictional Course',staff_id:'staff-test',semester:'1-2'};await app.saveCourse();assert.equal(calls[0].path,'/courses');assert.equal(calls[0].method,'POST');assert.equal(calls[0].body.semester,'1-2');assert.equal(calls[0].body.components.length,2);});
test('edit course sends string semester',async()=>{const {app,calls}=setup();app.editCourse({id:'course-test',code:'TEST101',name:'Fictional Course',staff_id:'staff-test',semester:'2-1'});app.courseForm.semester='4-2';await app.saveCourse();assert.equal(calls[0].path,'/courses/course-test');assert.equal(calls[0].method,'PUT');assert.equal(calls[0].body.semester,'4-2');});
test('semester inputs are text controls, not numeric coercion',()=>{const html=fs.readFileSync(require('node:path').join(__dirname,'../src/app.html'),'utf8');for(const id of ['uSemester','cSemester']){const input=html.match(new RegExp('<input[^>]*id="'+id+'"[^>]*>'))?.[0];assert.ok(input);assert.match(input,/type="text"/);assert.doesNotMatch(input,/type="number"/);}});
