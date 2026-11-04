import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
type Role = 'admin'|'staff'|'student'|'parent';
interface User {id:string;username:string;name:string;role:Role;department:string;semester:string;child_id:string|null;active?:boolean;}
interface Course {id:string;code:string;name:string;staff_id:string;staff_name:string;semester:string;components:{key:string;label:string;max:number}[];marks?:Record<string,number|null>;attendance?:{held:number;present:number;percentage:number|null};sessions?:{date:string;slot:number;present:boolean}[];}
interface Records {student:User;courses:Course[];attendance:{held:number;present:number;percentage:number|null};}
@Component({selector:'su-app',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.html'})
export class AppComponent implements OnInit {
 user:User|null=null; csrf=''; ready=false; busy=false; error=''; success=''; role:Role|null=null; roles:Role[]=['admin','staff','student','parent']; view='Home'; username=''; password=''; showPassword=false; noticeSearch=''; notices:any[]=[]; timetable:any[]=[]; courses:Course[]=[]; students:User[]=[]; users:User[]=[]; feedback:any[]=[]; records:Records|null=null; selectedStudent=''; from=''; to=''; today=new Date().toLocaleDateString('en-CA');
 currentPassword=''; newPassword=''; feedbackForm={course_id:'',rating:5,comment:''}; question=''; consent=false; answer=''; answerMode=''; userEditId=''; userForm:any=this.emptyUser(); courseForm:any={code:'',name:'',staff_id:'',semester:'2-1'}; courseEditId=''; enrollment={student_id:'',course_id:''}; staffCourse=''; marks:Record<string,number|null>={}; attendance={date:this.today,slot:1,present:true};
 emptyUser(){return {username:'',name:'',password:'',role:'student',department:'',semester:'2-1',child_id:null,active:true};}
 async ngOnInit(){await this.run(async()=>{const s=await this.api('/auth/session');this.setSession(s);this.notices=await this.api('/notices');if(this.user)await this.load();});this.ready=true;}
 async api(path:string,method='GET',body?:unknown):Promise<any>{const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(method!=='GET'?{'X-CSRF-Token':this.csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json().catch(()=>({error:'The server returned an unreadable response.'}));if(!r.ok)throw new Error(data.error||'Request failed. Please try again.');return data;}
 async run(task:()=>Promise<void>,message=''){this.busy=true;this.error='';this.success='';try{await task();this.success=message;}catch(e){this.error=e instanceof Error?e.message:'Unable to complete request.';}finally{this.busy=false;}}
 setSession(s:any){this.user=s.user;this.csrf=s.csrfToken;this.role=this.user?.role||this.role;}
 login(){this.run(async()=>{this.setSession(await this.api('/auth/login','POST',{username:this.username,password:this.password,role:this.role}));this.password='';await this.load();});}
 logout(){this.run(async()=>{await this.api('/auth/logout','POST',{});this.setSession(await this.api('/auth/session'));this.records=null;this.users=[];this.students=[];this.courses=[];this.feedback=[];this.answer='';this.question='';this.view='Home';this.role=null;});}
 async load(){this.courses=await this.api('/courses');this.timetable=await this.api('/timetable');if(this.user?.role==='admin'||this.user?.role==='staff'){this.students=await this.api('/students');if(!this.students.some(s=>s.id===this.selectedStudent))this.selectedStudent=this.students[0]?.id||'';}if(this.user?.role==='admin')this.users=await this.api('/users');if(this.user?.role!=='parent')this.feedback=await this.api('/feedback');await this.loadRecords();}
 async loadRecords(){if((this.user?.role==='admin'||this.user?.role==='staff')&&!this.selectedStudent){this.records=null;return;}const q=new URLSearchParams();if(this.user?.role==='admin'||this.user?.role==='staff')q.set('studentId',this.selectedStudent);if(this.from)q.set('from',this.from);if(this.to)q.set('to',this.to);this.records=null;this.marks={};this.records=await this.api('/records?'+q);this.syncMarks();}
 refreshRecords(){this.run(()=>this.loadRecords());}
 syncMarks(){if(!this.records?.courses.some(c=>c.id===this.staffCourse))this.staffCourse=this.records?.courses[0]?.id||'';this.marks={...(this.records?.courses.find(c=>c.id===this.staffCourse)?.marks||{})};}
 get editingCourse(){return this.records?.courses.find(c=>c.id===this.staffCourse);}
 get navigation(){return ['Home','Profile','Attendance','Results',...(this.user?.role!=='parent'?['Feedback']:[]),'Exams',...(this.user?.role==='student'?['Study assistant']:[]),...(this.user?.role==='admin'?['Users','Courses']:[])];}
 get filteredNotices(){const q=this.noticeSearch.toLowerCase();return this.notices.filter(n=>(n.title+' '+n.body+' '+n.type).toLowerCase().includes(q));}
 get assessed(){return this.records?.courses.reduce((s,c)=>s+c.components.filter(p=>c.marks?.[p.key]!=null).length,0)||0;}
 get totalComponents(){return this.records?.courses.reduce((s,c)=>s+c.components.length,0)||0;}
 get staffUsers(){return this.users.filter(u=>u.role==='staff'&&u.active!==false);}
 percentage(value:number|null|undefined){return value==null?'Not assessed':value.toFixed(1)+'%';}
 mark(c:Course,key:string){return c.marks?.[key]??'Not assessed';}
 total(c:Course){const values=c.components.map(p=>c.marks?.[p.key]);return values.some(v=>v==null)?'Not fully assessed':values.reduce<number>((a,v)=>a+(v??0),0)+' / '+c.components.reduce((a,p)=>a+p.max,0);}
 changePassword(){this.run(async()=>{await this.api('/auth/password','POST',{currentPassword:this.currentPassword,newPassword:this.newPassword});this.currentPassword='';this.newPassword='';this.password='';this.setSession(await this.api('/auth/session'));this.records=null;this.users=[];this.students=[];this.courses=[];this.feedback=[];this.timetable=[];this.selectedStudent='';this.staffCourse='';this.marks={};this.answer='';this.question='';this.consent=false;this.view='Home';},'Password changed. Please sign in again with your new password.');}
 submitFeedback(){this.run(async()=>{await this.api('/feedback','POST',this.feedbackForm);this.feedback=await this.api('/feedback');this.feedbackForm.comment='';},'Your identified feedback has been saved.');}
 ask(){this.run(async()=>{const a=await this.api('/assistant','POST',{question:this.question,consent:this.consent});this.answer=a.answer;this.answerMode=a.mode;});}
 saveMarks(){this.run(async()=>{const clean:Record<string,number|null>={};for(const p of this.editingCourse?.components||[])clean[p.key]=this.marks[p.key]??null;await this.api('/marks','PUT',{student_id:this.selectedStudent,course_id:this.staffCourse,marks:clean});await this.loadRecords();},'Marks saved. Blank components remain not assessed.');}
 saveAttendance(){this.run(async()=>{await this.api('/attendance','POST',{student_id:this.selectedStudent,course_id:this.staffCourse,...this.attendance});await this.loadRecords();},'Attendance session saved.');}
 editUser(u:User){this.userEditId=u.id;this.userForm={...u,password:''};}
 resetUser(){this.userEditId='';this.userForm=this.emptyUser();}
 saveUser(){this.run(async()=>{if(this.userEditId){const {name,department,child_id,active}=this.userForm;await this.api('/users/'+this.userEditId,'PUT',{name,department,semester:String(this.userForm.semester).trim(),child_id,active});}else await this.api('/users','POST',{...this.userForm,semester:String(this.userForm.semester).trim()});this.resetUser();await this.load();},'User saved.');}
 deactivate(u:User){if(!window.confirm('Deactivate '+u.name+'? Academic history will be retained.'))return;this.run(async()=>{await this.api('/users/'+u.id,'DELETE',{});await this.load();},'Account deactivated; academic history retained.');}
 editCourse(c:Course){this.courseEditId=c.id;this.courseForm={code:c.code,name:c.name,staff_id:c.staff_id,semester:c.semester};}
 resetCourse(){this.courseEditId='';this.courseForm={code:'',name:'',staff_id:'',semester:'2-1'};}
 saveCourse(){this.run(async()=>{const body=this.courseEditId?{name:this.courseForm.name,staff_id:this.courseForm.staff_id,semester:String(this.courseForm.semester).trim()}:{...this.courseForm,semester:String(this.courseForm.semester).trim(),components:this.newComponents};await this.api('/courses'+(this.courseEditId?'/'+this.courseEditId:''),this.courseEditId?'PUT':'POST',body);this.resetCourse();await this.load();},'Course and assignment saved.');}
 newComponents=[{key:'internal',label:'Internal assessment',max:40},{key:'final',label:'Final examination',max:60}];
 enroll(){this.run(async()=>{await this.api('/enrollments','POST',this.enrollment);await this.load();},'Enrollment saved.');}
 print(){window.print();}
}
