const SHEET_NAME = 'sales';

function doGet(e) {
  enableCORS();
  if (!isAuthorized(e)) return unauthorized();

  const { parameter } = e;
  const mode = parameter.mode || 'rows';
  if (mode === 'stats') {
    const store = parameter.store || 'ALL';
    const start = parameter.start || '';
    const end   = parameter.end   || '';
    const data  = getStats(store, start, end);
    return json(data);
  }

  const limit = parseInt((parameter.limit || '1000'), 10);
  const data = getRows(limit);
  return json(data);
}

function doPost(e) {
  enableCORS();
  if (!isAuthorized(e)) return unauthorized();

  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok:false, error:'Invalid JSON' }, 400);
  }

  const { chip_type, size_cls, size_digits, price_total, store, month } = body;
  if (!chip_type || !store || (!price_total && price_total !== 0)) {
    return json({ ok:false, error:'chip_type, store, price_total are required' }, 400);
  }

  const map = { 'S': '26569', 'M': '15458', 'L': '04347' };
  let finalDigits = '';
  if (size_cls && map[size_cls]) finalDigits = map[size_cls];
  else if (size_digits) finalDigits = String(size_digits);

  const ts = new Date();
  const iso = Utilities.formatDate(ts, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
  const monthStr = month && /^\d{4}-\d{2}$/.test(month)
    ? month
    : Utilities.formatDate(ts, Session.getScriptTimeZone(), "yyyy-MM");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['timestamp','month','chip_type','size_cls','size_digits','price_total','store','source']);
  }
  sh.appendRow([iso, monthStr, chip_type, size_cls || '', finalDigits || '', Number(price_total), store, 'webapp']);

  return json({ ok:true, message:'saved' });
}

function getRows(limit) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) return { rows: [] };
  const values = sh.getDataRange().getValues();
  const header = values.shift();
  const rows = values.slice(-limit).map(r => {
    const obj = {};
    header.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return { rows };
}

function getStats(store, start, end) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) return { totals:{}, items:[], period:{start,end} };

  const values = sh.getDataRange().getValues();
  const header = values.shift();
  const idx = (name) => header.indexOf(name);

  const iMonth = idx('month');
  const iType  = idx('chip_type');
  const iPrice = idx('price_total');
  const iStore = idx('store');

  const inPeriod = (m) => (!start || m >= start) && (!end || m <= end);

  const filtered = values.filter(r => {
    const m = r[iMonth];
    const s = r[iStore];
    return inPeriod(m) && (store==='ALL' || s===store);
  });

  const countByType = {};
  const revenueByStore = {};
  let totalCount = 0, totalRevenue = 0;

  filtered.forEach(r => {
    const t = r[iType];
    const s = r[iStore];
    const p = Number(r[iPrice]) || 0;
    countByType[t] = (countByType[t]||0)+1;
    revenueByStore[s] = (revenueByStore[s]||0)+p;
    totalCount += 1;
    totalRevenue += p;
  });

  return {
    period: { start, end },
    filter: { store },
    totals: { totalCount, totalRevenue },
    breakdown: { countByType, revenueByStore }
  };
}

function json(obj, status=200) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setStatusCode(status);
}

function enableCORS() { HtmlService.createHtmlOutput(''); }

function isAuthorized(e) {
  const token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  const apiKeyFromQuery = (e && e.parameter && e.parameter.api_key) || '';
  return !!token && apiKeyFromQuery === token;
}

function unauthorized() {
  return json({ ok:false, error:'Unauthorized' }, 401);
}
