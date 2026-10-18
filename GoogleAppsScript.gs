const SPREADSHEET_ID = '1WQwiwTcddeNAeI0-FLkVC7Xr3byNzujCJTy8UrOK2RY';
const SHEET_NAME = 'Orders';
const HEADERS = [
  'Order ID',
  'Date',
  'Customer Name',
  'Phone',
  'Address',
  'Product',
  'Color',
  'Size',
  'Quantity',
  'Total',
  'Status'
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const order = normalizeOrder_(payload);
    validateOrder_(order);

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const headers = getHeaders_(sheet);
      order.id = nextOrderId_(sheet, headers);
      const items = order.items;
      const products = items.map(function (item) {
        return safeText_(item.name + ' x' + item.qty);
      }).join('\n');
      const colors = items.map(function (item) {
        return safeText_(item.color);
      }).join('\n');
      const sizes = items.map(function (item) {
        return safeText_(item.size);
      }).join('\n');
      const quantity = order.quantity != null
        ? order.quantity
        : items.map(function (item) { return item.qty; }).join('\n');
      const address = [order.customer.city, order.customer.address]
        .filter(Boolean)
        .map(safeText_)
        .join(', ');

      const valuesByHeader = {
        orderid: safeText_(order.id),
        date: new Date(order.createdAt),
        orderdate: new Date(order.createdAt),
        customername: safeText_(order.customer.name),
        customer: safeText_(order.customer.name),
        name: safeText_(order.customer.name),
        phone: safeText_(order.customer.phone),
        phonenumber: safeText_(order.customer.phone),
        mobile: safeText_(order.customer.phone),
        mobileno: safeText_(order.customer.phone),
        address: address,
        deliveryaddress: address,
        product: products,
        item: products,
        items: products,
        color: colors,
        colour: colors,
        size: sizes,
        quantity: quantity,
        qty: quantity,
        total: Number(order.total),
        grandtotal: Number(order.total),
        status: 'New',
        city: safeText_(order.customer.city),
        notes: safeText_(order.customer.notes || ''),
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        currency: safeText_(order.currency),
        payment: safeText_(order.payment)
      };
      const row = headers.map(function (header) {
        const key = normalizeHeader_(header);
        if (!Object.prototype.hasOwnProperty.call(valuesByHeader, key)) {
          throw new Error('Unsupported column header: ' + header);
        }
        return valuesByHeader[key];
      });
      const rowNumber = sheet.getLastRow() + 1;
      const textColumns = headers.reduce(function (columns, header, index) {
        const key = normalizeHeader_(header);
        if (key === 'orderid' || key === 'phone' || key === 'phonenumber' ||
            key === 'mobile' || key === 'mobileno') {
          columns.push(index + 1);
        }
        return columns;
      }, []);
      textColumns.forEach(function (column) {
        sheet.getRange(rowNumber, column).setNumberFormat('@');
      });
      sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function getHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return HEADERS;
  }

  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return HEADERS;
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  while (headers.length && !headers[headers.length - 1].trim()) {
    headers.pop();
  }
  if (headers.some(function (header) { return !header.trim(); })) {
    throw new Error('The Orders sheet has a blank column header. Add a header or remove that column.');
  }
  return headers;
}

function normalizeHeader_(header) {
  return String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function nextOrderId_(sheet, headers) {
  const orderIdColumn = headers.findIndex(function (header) {
    return normalizeHeader_(header) === 'orderid';
  }) + 1;
  if (orderIdColumn < 1 || sheet.getLastRow() < 2) {
    return 'MIA-001';
  }

  const ids = sheet.getRange(2, orderIdColumn, sheet.getLastRow() - 1, 1)
    .getDisplayValues()
    .map(function (row) { return row[0].trim(); })
    .filter(Boolean);
  const largestSequentialId = ids.reduce(function (largest, id) {
    const match = /^MIA-(\d{1,3})$/i.exec(id);
    return match ? Math.max(largest, Number(match[1])) : largest;
  }, 0);
  return 'MIA-' + String(Math.max(ids.length, largestSequentialId) + 1).padStart(3, '0');
}

function normalizeOrder_(payload) {
  const customer = payload.customer || {};
  let items = payload.items;
  if (!Array.isArray(items) && payload.product) {
    const names = String(payload.product).split('\n');
    const colors = String(payload.color || '').split('\n');
    const sizes = String(payload.size || '').split('\n');
    const quantities = String(payload.quantity == null ? '' : payload.quantity).split('\n');
    items = names.map(function (name, index) {
      return {
        name: name.replace(/\s+x\d+$/, ''),
        color: colors[index] || colors[0] || '',
        size: sizes[index] || sizes[0] || '',
        qty: Number(quantities[index]) || Number(quantities[0]) || 1,
        price: 0
      };
    });
  }

  const city = customer.city || payload.city || '';
  const address = customer.address || payload.streetAddress || payload.address || '';
  const notes = customer.notes || payload.notes || '';
  const total = Number(payload.total);
  const subtotal = Number(payload.subtotal != null ? payload.subtotal : total);
  const shipping = Number(payload.shipping || 0);

  return {
    id: payload.id || payload.orderId || payload.orderID || payload.order_number || payload.orderNumber,
    createdAt: payload.createdAt || payload.date,
    customer: {
      name: customer.name || customer.fullName || payload.customerName || payload.customer_name ||
        payload.fullName || payload.full_name || payload.clientName || payload.name,
      phone: customer.phone || customer.mobile || payload.phone || payload.phoneNumber ||
        payload.phone_number || payload.mobile,
      city: city,
      address: address,
      notes: notes
    },
    items: items,
    quantity: payload.quantity == null ? null : Array.isArray(payload.quantity)
      ? payload.quantity.map(Number).join('\n')
      : String(payload.quantity),
    subtotal: subtotal,
    shipping: shipping,
    total: total,
    currency: payload.currency || 'EGP',
    payment: payload.payment || 'COD'
  };
}

function validateOrder_(order) {
  if (!order || typeof order !== 'object' || !order.id || !order.createdAt ||
      !order.customer || !Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('Invalid order payload');
  }
  if (!order.customer.name || !order.customer.phone || !order.customer.city ||
      !order.customer.address || !order.currency) {
    throw new Error('Order is missing required customer or payment details');
  }
  if (![order.subtotal, order.shipping, order.total].every(function (value) {
    return typeof value === 'number' && Number.isFinite(value);
  })) {
    throw new Error('Order totals must be valid numbers');
  }
  order.items.forEach(function (item) {
    if (!item || !item.name || !item.color || !item.size ||
        typeof item.qty !== 'number' || !Number.isFinite(item.qty) ||
        typeof item.price !== 'number' || !Number.isFinite(item.price)) {
      throw new Error('Order contains an invalid item');
    }
  });
}

function safeText_(value) {
  const text = String(value == null ? '' : value);
  return /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
