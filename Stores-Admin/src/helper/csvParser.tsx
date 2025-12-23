// import fs from 'fs';
import Papa from 'papaparse';

// fs.readFile('toTestParser.csv', 'utf8', (err, data) => {
//     if (err) {
//         console.error(err);
//         return;
//     }
//     parseCsv({ data });
// });

// interface ParseCsvFile {
//     file: File;
// }

const parseCsv = (file: any) => {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',',
    });
};

export default parseCsv;
