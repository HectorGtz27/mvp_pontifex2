const XLSX = require('xlsx');
const path = process.argv[2] || require('path').join(__dirname, '..', '..', 'master_client_pontifex.xlsx');
const wb = XLSX.readFile(path);
console.log('SheetNames:', JSON.stringify(wb.SheetNames));
wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log('\n--- Sheet:', name, '---');
  console.log(rows.slice(0, 25).map(r => JSON.stringify(r)).join('\n'));
});
