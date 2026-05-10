const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function readPDF(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    console.error('文件不存在:', pdfPath);
    return;
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);

  fs.writeFileSync('pdf-output.txt', data.text, 'utf8');
  console.log('已保存到 pdf-output.txt');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('用法: node read-pdf.js <PDF文件路径>');
  process.exit(1);
}

const pdfPath = args[0];
readPDF(pdfPath).catch(console.error);
