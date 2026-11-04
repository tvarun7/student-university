import {scrypt as rawScrypt,randomBytes,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(rawScrypt);
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(password,salt,64)).toString('hex');}
export async function verifyPassword(password,hash){const [salt,key]=hash.split(':');const candidate=await scrypt(password,salt,64);return timingSafeEqual(candidate,Buffer.from(key,'hex'));}
export function strongPassword(p){return typeof p==='string'&&p.length>=12&&p.length<=128;}
export function csrf(){return randomBytes(32).toString('hex');}
