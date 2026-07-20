-- ITAGRE Village Map: villager-photosバケットにファイルサイズ上限を設定
-- クライアント側(src/lib/validateImageFile.ts)の5MB制限と合わせ、サーバー側でも
-- 同じ上限を強制する（defense-in-depth。クライアント側チェックをすり抜けても防げるように）

update storage.buckets
set file_size_limit = 5242880 -- 5MB
where id = 'villager-photos';
