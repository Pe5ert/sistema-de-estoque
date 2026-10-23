import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default {root,server:{host:'127.0.0.1',port:5183,strictPort:true}};
