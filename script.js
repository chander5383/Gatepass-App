/**
 * Apps Script for GatePass v17
 * - App will auto-number Gate Pass (format GWPTL/ABO/YYYY/NNN)
 * - Append data into "Pending" sheet by default
 * - Returns {status:'ok', gpNo: '...', row: 12}
 */

function doPost(e){
  try{
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var pending = ss.getSheetByName('Pending') || ss.insertSheet('Pending');
    var body = JSON.parse(e.postData.contents);

    // create GP number server-side: GWPTL/ABO/2025/NNN (NNN increment)
    var year = new Date(body.date||new Date()).getFullYear();
    var prefix = 'GWPTL/ABO/' + year + '/';
    // find last GP nos in column 2 (if we store gpNo in col 2)
    var data = pending.getRange(2,2, Math.max(0, pending.getLastRow()-1), 1).getValues().flat();
    var lastNum = 0;
    data.forEach(function(v){
      if(v && v.toString().startsWith(prefix)){
        var parts = v.toString().split('/');
        var n = parseInt(parts[parts.length-1]) || 0;
        if(n>lastNum) lastNum = n;
      }
    });
    var newNum = ('000' + (lastNum+1)).slice(-3);
    var gpNo = prefix + newNum;

    // Append row (choose columns as required)
    pending.appendRow([ new Date(), gpNo, body.date, body.type, body.consignee, body.person, body.authority, body.totalQty, body.remarks, JSON.stringify(body.items), body.issuedName, body.issuedDesig, body.outwardSr, body.receivedSecurityDate, body.inwardSr, body.receivedName, body.receivedDesig ]);

    return ContentService.createTextOutput(JSON.stringify({status:'ok', gpNo: gpNo})).setMimeType(ContentService.MimeType.JSON);

  } catch(err){
    return ContentService.createTextOutput(JSON.stringify({status:'error', message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
