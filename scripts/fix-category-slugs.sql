-- 카테고리 slug를 한글로 변경 (URL 매칭)
UPDATE categories SET slug = '채무·금전' WHERE slug = 'debt-finance';
UPDATE categories SET slug = '전세·임대차' WHERE slug = 'lease-rental';
UPDATE categories SET slug = '행정·기타' WHERE slug = 'admin-etc';
UPDATE categories SET slug = '계약·거래' WHERE slug = 'contract-trade';
UPDATE categories SET slug = '교통사고' WHERE slug = 'traffic-accident';
UPDATE categories SET slug = '회생·파산' WHERE slug = 'bankruptcy';
UPDATE categories SET slug = '기타' WHERE slug = 'etc';
