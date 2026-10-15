import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ImagesService } from './images.service';
import { CloudinaryStorage } from './cloudinary-storage';

const connection=process.env.IMAGES_TEST_DATABASE_URL;
describe('managed image lifecycle in isolated PostgreSQL',{skip:!connection},()=>{
  let db:PrismaService, inventory:InventoryService;
  const run=randomUUID(),owner=randomUUID(),other=randomUUID(),category=randomUUID();
  const imageIds:string[]=[],productIds:string[]=[];
  before(async()=>{
    const url=new URL(connection!);
    assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.pathname.endsWith('_stock_test'),'Use only an isolated loopback _stock_test database');
    const config=new ConfigService({DATABASE_URL:connection,BACKUP_RETENTION_DAYS:365});db=new PrismaService(config);inventory=new InventoryService(db,config);
    await db.category.create({data:{id:category,name:'Image QA '+run}});
  });
  after(async()=>{
    if(!db)return;
    try {await db.product.deleteMany({where:{id:{in:productIds}}});await db.productImage.deleteMany({where:{id:{in:imageIds}}});await db.category.deleteMany({where:{id:category}});}finally{await db.$disconnect();}
  });
  async function asset(){const id=randomUUID();imageIds.push(id);return db.productImage.create({data:{id,ownerId:owner,publicId:'gavyo/products/'+id,url:'https://res.cloudinary.com/qa/image/upload/v1/gavyo/products/'+id+'.webp',state:'READY',expiresAt:new Date(Date.now()+86400_000)}});}
  async function product(imageUrl:string,sku=randomUUID()){
    const result=await inventory.createProduct({sku:run+'-'+sku,name:'Photo QA',categoryId:category,unit:'UNIT',minimumStock:'0',imageUrl},owner);
    productIds.push(result!.id);return result!;
  }
  test('attachment, duplicate rollback, ownership and replacement retention are atomic',async()=>{
    const first=await asset(),second=await asset();const p=await product(first.url!);
    assert.equal((await db.productImage.findUniqueOrThrow({where:{id:first.id}})).expiresAt,null);
    await assert.rejects(inventory.createProduct({sku:p.sku,name:'Duplicate',categoryId:category,unit:'UNIT',minimumStock:'0',imageUrl:second.url},owner),/SKU/);
    assert.ok((await db.productImage.findUniqueOrThrow({where:{id:second.id}})).expiresAt);
    await assert.rejects(inventory.patchProduct(p.id,{imageUrl:second.url},other),/outro usuário/);
    assert.equal((await db.product.findUniqueOrThrow({where:{id:p.id}})).imageUrl,first.url);
    await inventory.patchProduct(p.id,{imageUrl:second.url},owner);
    const old=await db.productImage.findUniqueOrThrow({where:{id:first.id}});
    assert.ok(old.expiresAt!.getTime()>Date.now()+364*86400_000);
    assert.equal((await db.productImage.findUniqueOrThrow({where:{id:second.id}})).expiresAt,null);
  });
  test('simultaneous image swaps retain both referenced assets without deadlock',async()=>{
    const a=await asset(),b=await asset(),p=await product(a.url!),q=await product(b.url!);
    await Promise.all([inventory.patchProduct(p.id,{imageUrl:b.url},owner),inventory.patchProduct(q.id,{imageUrl:a.url},owner)]);
    for(const id of [a.id,b.id])assert.equal((await db.productImage.findUniqueOrThrow({where:{id}})).expiresAt,null);
    assert.equal((await db.product.findUniqueOrThrow({where:{id:p.id}})).stock.toString(),'0');
  });
  test('cleanup deletes only expired unreferenced assets and protects attached legacy rows',async()=>{
    const linked=await asset(),orphan=await asset();await product(linked.url!);
    await db.productImage.updateMany({where:{id:{in:[linked.id,orphan.id]}},data:{expiresAt:new Date(0)}});
    const destroyed:string[]=[];
    const storage={enabled:true,destroy:async(id:string)=>{destroyed.push(id);}} as unknown as CloudinaryStorage;
    await new ImagesService(db,storage).cleanup();
    assert.ok(destroyed.includes(orphan.publicId));assert.ok(!destroyed.includes(linked.publicId));
    assert.equal((await db.productImage.findUniqueOrThrow({where:{id:orphan.id}})).state,'DELETED');
    assert.equal((await db.productImage.findUniqueOrThrow({where:{id:linked.id}})).expiresAt,null);
  });
});
