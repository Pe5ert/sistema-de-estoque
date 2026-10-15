import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ImagesModule } from './images.module';
import { ImagesService } from './images.service';
import { PrismaService } from '../prisma/prisma.service';
import { configureAuthHttp } from '../auth/auth.http';
import { HttpExceptionFilter } from '../common/http-exception.filter';

describe('image HTTP permissions, CSRF and multipart limits', () => {
  let app: INestApplication, base: string, cookie: string, calls=0;
  let role='OPERATOR'; const actor=randomUUID(), product=randomUUID(), origin='http://localhost:5175';
  before(async () => {
    const module = await Test.createTestingModule({imports:[ConfigModule.forRoot({isGlobal:true,ignoreEnvFile:true,load:[()=>({JWT_SECRET:'isolated-image-http-secret-01234567890123456789',WEB_ORIGIN:origin})]}),ImagesModule]})
      .overrideProvider(PrismaService).useValue({user:{findUnique:async()=>({id:actor,name:'Image QA',email:'image@example.test',role,active:true})},product:{findUnique:async()=>({id:product})}})
      .overrideProvider(ImagesService).useValue({upload:async()=>{calls++;return {imageUrl:'https://example.test/photo.webp'};}}).compile();
    app=module.createNestApplication({logger:false}); app.setGlobalPrefix('api'); configureAuthHttp(app,app.get(ConfigService)); app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0,'127.0.0.1'); base=await app.getUrl(); cookie='stock_session='+await app.get(JwtService).signAsync({sub:actor});
  });
  after(async()=>{await app?.close();});
  const request=(path='',session=true,requestOrigin=origin,size=10)=>{
    const body=new FormData();body.append('file',new Blob([Buffer.alloc(size)],{type:'image/png'}),'photo.png');
    return fetch(base+'/api/product-images'+path,{method:'POST',headers:{Origin:requestOrigin,...(session?{Cookie:cookie}:{})},body});
  };
  test('requires session and allowed origin before accepting an upload',async()=>{
    assert.equal((await request('',false)).status,401); assert.equal((await request('',true,'https://wrong.example')).status,403);assert.equal(calls,0);
  });
  test('operator can prepare a creation image but cannot upload for editing a product',async()=>{
    role='OPERATOR';assert.equal((await request()).status,201);assert.equal((await request('/'+product)).status,403);
  });
  test('manager can upload an edit; invalid IDs and oversized multipart fail',async()=>{
    role='MANAGER';assert.equal((await request('/'+product)).status,201);const before=calls;
    assert.equal((await request('/not-a-uuid')).status,400);assert.equal((await request('',true,origin,5*1024*1024+1)).status,413);assert.equal(calls,before);
  });
});
