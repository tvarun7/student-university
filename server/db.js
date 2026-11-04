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
`; if(pool) await pool.query(sql); else await embedded.exec(sql); }
