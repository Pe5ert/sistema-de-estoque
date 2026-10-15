import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { prepareImage, MAX_IMAGE_BYTES } from './image-file';
import { claimImage, releaseImage, isManagedImage } from './image-lifecycle';
import type { Prisma } from '../generated/prisma/client';

test('image validation rejects empty, oversized, forged MIME and unsupported files', async () => {
  await assert.rejects(prepareImage(), /Selecione/);
  await assert.rejects(prepareImage({buffer:Buffer.alloc(MAX_IMAGE_BYTES+1),mimetype:'image/png'}), /5 MB/);
  await assert.rejects(prepareImage({buffer:Buffer.from('not an image'),mimetype:'image/png'}), /válida/);
  const png = await sharp({create:{width:10,height:10,channels:3,background:'#fff'}}).png().toBuffer();
  await assert.rejects(prepareImage({buffer:png,mimetype:'image/jpeg'}), /válida/);
});
test('real decoding normalizes orientation/metadata and limits output dimensions', async () => {
  const input = await sharp({create:{width:1800,height:30,channels:3,background:'#123'}}).jpeg().withExif({IFD0:{Artist:'QA private metadata'}}).toBuffer();
  const output = await prepareImage({buffer:input,mimetype:'image/jpeg'});
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format,'webp'); assert.equal(metadata.width,1600); assert.equal(metadata.exif,undefined);
});
test('claim protects ownership, expiry and deletion, while unchanged legacy URLs remain valid', async () => {
  const url='https://res.cloudinary.com/qa/image/upload/v1/gavyo/products/11111111-1111-4111-8111-111111111111.webp';
  assert.equal(isManagedImage(url),true); assert.equal(isManagedImage('https://example.test/image.webp'),false);
  let record={id:'image',ownerId:'owner',state:'READY',expiresAt:null as Date|null}; let writes=0;
  const tx={$queryRaw:async()=>[record],productImage:{update:async()=>{writes++;}}} as unknown as Prisma.TransactionClient;
  await assert.rejects(claimImage(tx,url,'other'), /outro usuário/);
  record={...record,state:'DELETING'}; await assert.rejects(claimImage(tx,url,'owner'), /indisponível/);
  record={...record,state:'READY',expiresAt:new Date(0)}; await assert.rejects(claimImage(tx,url,'owner'), /expirou/);
  record={...record,expiresAt:null}; await claimImage(tx,url,'owner'); assert.equal(writes,1);
  await claimImage(tx,url,'other',url); assert.equal(writes,1);
});
test('replaced photos retain backup lifetime and shared URLs are not scheduled for deletion', async () => {
  const url='https://res.cloudinary.com/qa/image/upload/v1/gavyo/products/11111111-1111-4111-8111-111111111111.webp';
  let referenced=1, writes=0;
  const tx={$queryRaw:async()=>[],product:{count:async()=>referenced},productImage:{updateMany:async(input:{data:{expiresAt:Date}})=>{assert.ok(input.data.expiresAt.getTime()>Date.now()+364*86400_000); writes++;}}} as unknown as Prisma.TransactionClient;
  await releaseImage(tx,url,null,365); assert.equal(writes,0);
  referenced=0; await releaseImage(tx,url,null,365); assert.equal(writes,1);
});
