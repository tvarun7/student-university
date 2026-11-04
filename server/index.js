import {initDb,db} from './db.js';
import {app} from './app.js';
await initDb();
const port=Number(process.env.PORT||3000);
const server=app.listen(port,()=>console.log('Student University: http://localhost:'+port));
async function shutdown(){server.close(async()=>{await db.close();process.exit(0);});}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
