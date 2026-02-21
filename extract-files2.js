const fs = require('fs');
const path = require('path');

// 추출할 파일 목록 (리뉴얼에 필요한 전체)
const FILES = [
  'app/page.tsx',
  'app/restaurant/page.tsx',
  'app/food/page.tsx',
  'app/food/search/page.tsx',
  'app/diet/page.tsx',
  'app/symptom/page.tsx',
  'app/search/page.tsx',
  'app/medicine/page.tsx',
  'components/layout/header.tsx',
  'components/layout/mobile-nav.tsx',
];

const separator = '='.repeat(80);
let output = `편하루 리뉴얼 - 파일 추출 (${new Date().toLocaleString('ko-KR')})\n`;
output += `총 ${FILES.length}개 파일\n`;
output += separator + '\n\n';

let found = 0;
let notFound = [];

for (const file of FILES) {
  const fullPath = path.resolve(file);
  output += `📄 파일: ${file}\n`;
  output += separator + '\n';

  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n').length;
    output += `(${lines}줄)\n\n`;
    output += content;
    output += '\n\n';
    found++;
  } else {
    output += '⚠️ 파일을 찾을 수 없습니다\n\n';
    notFound.push(file);
  }

  output += separator + '\n\n';
}

output += `\n완료: ${found}개 추출 / ${notFound.length}개 없음\n`;
if (notFound.length > 0) {
  output += `없는 파일: ${notFound.join(', ')}\n`;
}

const outFile = 'extracted-files.txt';
fs.writeFileSync(outFile, output, 'utf-8');
console.log(`✅ ${outFile} 생성 완료 (${found}/${FILES.length}개 파일)`);
if (notFound.length > 0) {
  console.log(`⚠️ 못 찾은 파일: ${notFound.join(', ')}`);
}
