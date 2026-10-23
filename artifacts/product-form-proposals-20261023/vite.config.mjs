import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
export default {root:here,resolve:{alias:{'react-dom/client':path.resolve(here,'../../apps/web/node_modules/react-dom/client.js'),react:path.resolve(here,'../../apps/web/node_modules/react')}},server:{host:'127.0.0.1',port:5182,strictPort:true}};
