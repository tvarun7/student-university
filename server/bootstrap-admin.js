import {randomUUID} from 'node:crypto';
import {db,initDb} from './db.js';
import {hashPassword,strongPassword} from './security.js';
try{
 await initDb();
 if((await db.query("SELECT id FROM users WHERE role='admin' LIMIT 1")).rows.length)throw new Error('Administrator exists. Refusing duplicate bootstrap.');
 const password=process.env.BOOTSTRAP_ADMIN_PASSWORD,username=process.env.BOOTSTRAP_ADMIN_USERNAME||'administrator';
 if(!strongPassword(password))throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD to a unique 12–128 character secret in the hosting environment.');
 if(!/^[a-zA-Z0-9_.@-]{1,80}$/.test(username))throw new Error('Invalid administrator username');
 await db.query('INSERT INTO users(id,username,name,role,password_hash) VALUES($1,$2,$3,$4,$5)',[randomUUID(),username,'University Administrator','admin',await hashPassword(password)]);
 console.log('Administrator created. Remove BOOTSTRAP_ADMIN_PASSWORD from the host environment now.');
}finally{await db.close();}
