const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
  const workbook = new ExcelJS.Workbook();
  const templatePath = path.join(__dirname, '../public/MASTER_Cliente_Template.xlsx');
  
  await workbook.xlsx.readFile(templatePath);
  
  const worksheet = workbook.getWorksheet('Infromacion General ');
  
  console.log('\n=== Estructura del Sheet "Infromacion General " ===\n');
  
  // Inspeccionar filas 5-13 para ver la estructura
  for (let row = 5; row <= 13; row++) {
    const excelRow = worksheet.getRow(row);
    console.log(`\n--- Fila ${row} ---`);
    
    for (let col = 1; col <= 15; col++) {
      const cell = excelRow.getCell(col);
      if (cell.value) {
        const colLetter = String.fromCharCode(64 + col); // A=65, B=66, etc
        console.log(`  ${colLetter}${row}: "${cell.value}" (tipo: ${cell.type})`);
      }
    }
  }
}

inspectTemplate().catch(console.error);
