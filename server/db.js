import {mkdir} from 'node:fs/promises';
import 'dotenv/config';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
const production=process.env.NODE_ENV==='production';
if(production && !process.env.DATABASE_URL) throw new Error('Production requires DATABASE_URL');
export const pool=process.env.TEST_DB!=='true'&&process.env.DATABASE_URL ? new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:undefined}) : null;
if(!pool&&process.env.TEST_DB!=='true')await mkdir('./.data',{recursive:true});
const embedded=pool?null:new PGlite(process.env.TEST_DB==='true'?undefined:'./.data/postgres');
export const db={query:(sql,args=[])=>pool?pool.query(sql,args):embedded.query(sql,args),close:()=>pool?pool.end():embedded.close()};
export async function transaction(fn){if(pool){const client=await pool.connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}return embedded.transaction(fn);}
export async function initDb(){const sql=`
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','staff','student','parent')),password_hash TEXT NOT NULL,department TEXT NOT NULL DEFAULT '',semester TEXT NOT NULL DEFAULT '',child_id TEXT REFERENCES users(id),active BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS courses(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,name TEXT NOT NULL,staff_id TEXT NOT NULL REFERENCES users(id),semester TEXT NOT NULL,components JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS enrollments(student_id TEXT REFERENCES users(id),course_id TEXT REFERENCES courses(id),PRIMARY KEY(student_id,course_id));
CREATE TABLE IF NOT EXISTS marks(student_id TEXT REFERENCES users(id),course_id TEXT REFERENCES courses(id),values_json JSONB NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW(),PRIMARY KEY(student_id,course_id));
CREATE TABLE IF NOT EXISTS attendance(student_id TEXT REFERENCES users(id),course_id TEXT REFERENCES courses(id),date DATE NOT NULL,slot INTEGER NOT NULL,present BOOLEAN NOT NULL,PRIMARY KEY(student_id,course_id,date,slot));
CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY,student_id TEXT REFERENCES users(id),course_id TEXT REFERENCES courses(id),staff_id TEXT REFERENCES users(id),rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),comment TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW(),UNIQUE(student_id,course_id));
CREATE TABLE IF NOT EXISTS notices(id TEXT PRIMARY KEY,title TEXT NOT NULL,type TEXT NOT NULL,body TEXT NOT NULL,date DATE NOT NULL);
CREATE TABLE IF NOT EXISTS timetable(id TEXT PRIMARY KEY,course_id TEXT REFERENCES courses(id),date DATE NOT NULL,time TEXT NOT NULL,room TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log(id TEXT PRIMARY KEY,actor_id TEXT REFERENCES users(id),action TEXT NOT NULL,target TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS enrollment_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS attendance_course ON attendance(course_id,date);
CREATE INDEX IF NOT EXISTS feedback_staff ON feedback(staff_id);
`; if(pool) await pool.query(sql); else await embedded.exec(sql); await migrate(); }

async function migrate(){await transaction(async tx=>{
 await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
 // Serialize concurrent startup migration attempts, including existing databases.
 await tx.query('LOCK TABLE schema_migrations IN EXCLUSIVE MODE');
 if(!(await tx.query('SELECT version FROM schema_migrations WHERE version=1')).rows.length){
 const statements=[
 'CREATE TABLE IF NOT EXISTS departments(id TEXT PRIMARY KEY,name TEXT NOT NULL,active BOOLEAN NOT NULL DEFAULT true)',
 'CREATE UNIQUE INDEX IF NOT EXISTS departments_name ON departments(lower(name))',
 'CREATE TABLE IF NOT EXISTS batches(id TEXT PRIMARY KEY,name TEXT NOT NULL,department_id TEXT NOT NULL REFERENCES departments(id),semester TEXT NOT NULL)',
 'CREATE UNIQUE INDEX IF NOT EXISTS batches_name ON batches(department_id,lower(name))',
 'ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES batches(id)',
 'ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0',
 'ALTER TABLE courses ALTER COLUMN staff_id DROP NOT NULL',
 'CREATE TABLE IF NOT EXISTS course_assignments(id TEXT PRIMARY KEY,course_id TEXT NOT NULL REFERENCES courses(id),batch_id TEXT NOT NULL REFERENCES batches(id),staff_id TEXT NOT NULL REFERENCES users(id),UNIQUE(course_id,batch_id))',
 'ALTER TABLE timetable ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES batches(id)',
 "ALTER TABLE timetable ADD COLUMN IF NOT EXISTS exam_type TEXT NOT NULL DEFAULT 'Exam'",
 'ALTER TABLE timetable ADD COLUMN IF NOT EXISTS start_time TEXT', 'ALTER TABLE timetable ADD COLUMN IF NOT EXISTS end_time TEXT',
 'CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,start_date DATE NOT NULL,end_date DATE NOT NULL,active BOOLEAN NOT NULL DEFAULT true,CHECK(start_date<=end_date))',
 'CREATE TABLE IF NOT EXISTS attendance_slots(id SERIAL PRIMARY KEY,label TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,active BOOLEAN NOT NULL DEFAULT true)',
 'ALTER TABLE attendance ADD COLUMN IF NOT EXISTS start_time TEXT', 'ALTER TABLE attendance ADD COLUMN IF NOT EXISTS end_time TEXT'
 ];for(const sql of statements)await tx.query(sql);
 if(!(await tx.query('SELECT id FROM attendance_slots LIMIT 1')).rows.length)for(let n=0;n<9;n++){const t=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');await tx.query('INSERT INTO attendance_slots(label,start_time,end_time) VALUES($1,$2,$3)',['Period '+(n+1),t(510+n*60),t(570+n*60)]);}
 await tx.query('INSERT INTO schema_migrations(version) VALUES(1)');
 }
 if(!(await tx.query('SELECT version FROM schema_migrations WHERE version=2')).rows.length){
  // Preserve the configured meaning of known legacy slot IDs exactly once. Unknown IDs stay intact.
  await tx.query('UPDATE attendance a SET start_time=COALESCE(a.start_time,s.start_time),end_time=COALESCE(a.end_time,s.end_time) FROM attendance_slots s WHERE a.slot=s.id AND (a.start_time IS NULL OR a.end_time IS NULL)');
  await tx.query('INSERT INTO schema_migrations(version) VALUES(2)');
 }
 });}
