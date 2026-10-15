import test from 'node:test';
import assert from 'node:assert/strict';
import { imageFileError, MAX_PRODUCT_IMAGE_BYTES } from '../src/product-image-model.ts';
test('photo selection accepts supported images at the size boundary and rejects empty/oversized/unsupported files',()=>{
  for(const type of ['image/jpeg','image/png','image/webp']) assert.equal(imageFileError({type,size:MAX_PRODUCT_IMAGE_BYTES}),'');
  assert.match(imageFileError({type:'image/png',size:0}),/vazio/);
  assert.match(imageFileError({type:'image/png',size:MAX_PRODUCT_IMAGE_BYTES+1}),/5 MB/);
  for(const type of ['image/svg+xml','image/gif','application/pdf']) assert.match(imageFileError({type,size:10}),/JPG/);
});
