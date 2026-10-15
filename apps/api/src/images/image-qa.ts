import 'reflect-metadata';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { hash } from 'argon2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

async function main() {
  const connection=process.env.IMAGES_TEST_DATABASE_URL;
  if(!connection)throw new Error('Defina IMAGES_TEST_DATABASE_URL.');
  const url=new URL(connection);
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||!url.pathname.endsWith('_stock_test'))throw new Error('Use somente banco local isolado _stock_test.');
  const credentials=process.env.IMAGE_CREDENTIALS_FILE;
  if(!credentials)throw new Error('Defina IMAGE_CREDENTIALS_FILE.');
  const values=dotenv.parse(readFileSync(credentials));
  Object.assign(process.env,Object.fromEntries(['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'].map(key=>[key,values[key] ?? ''])));
  Object.assign(process.env,{DATABASE_URL:connection,DIRECT_URL:connection,BACKUP_DATABASE_URL:connection,JWT_SECRET:'local-image-qa-only-012345678901234567890123',WEB_ORIGIN:'http://127.0.0.1:5175',API_PORT:'3012',BACKUP_AUTO_ENABLED:'false'});
  if(process.argv.includes('seed')) {
    const db=new PrismaService(new ConfigService({DATABASE_URL:connection}));
    try {
      await db.user.upsert({where:{email:'admin@images.example.test'},update:{},create:{email:'admin@images.example.test',name:'QA Imagens',role:'ADMIN',passwordHash:await hash('ImagensQA2026!')}});
      const category=await db.category.upsert({where:{name:'QA Fotos'},update:{},create:{name:'QA Fotos'}});
      await db.product.upsert({where:{sku:'IMAGEM-QA-DUPLICADO'},update:{},create:{sku:'IMAGEM-QA-DUPLICADO',name:'Produto existente QA',categoryId:category.id,unit:'UNIT'}});
      const directory=resolve('../../artifacts/product-images-20261015');mkdirSync(directory,{recursive:true});
      for(const [name,background] of [['photo-blue.png','#465ee4'],['photo-red.png','#ad3434']])writeFileSync(resolve(directory,name),await sharp({create:{width:96,height:96,channels:3,background}}).png().toBuffer());
      console.log('LOCAL_IMAGE_QA_READY');
    } finally {await db.$disconnect();}
  } else {await import('../main');}
}
void main().catch(()=>{console.error('Falha ao iniciar QA de imagens. Confira a configuração local.');process.exitCode=1;});
