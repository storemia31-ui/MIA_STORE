MIA Store updated files\n\nOpen index.html in your browser. Keep the images folder beside index.html.\nProduct photos should be 850 x 1024 pixels (portrait), with the garment centered and filling about 80% of the canvas. Transparent PNG is recommended. All product cards use this same portrait ratio.
The olive hoodie photos use cropped versions on matching canvases so the product appears the same size as the black hoodie. The originals are kept in the images folder.\n

Automatically save orders to Google Sheets
1. Open https://script.google.com/ and create a new project.
2. Copy the contents of GoogleAppsScript.gs into the project's Code.gs and save.
3. Choose Deploy > New deployment > Web app. Set "Execute as" to your account and access to "Anyone", then deploy and authorize it.
4. Copy the Web app URL ending in /exec and set it as CONFIG.sheetsWebhook in index.html. The current deployment URL has been added there.
5. Submit a test order and confirm it appears in the "Orders" tab of the linked spreadsheet.
The website sends both structured order data and explicit orderId, date, customerName, phone, address, product, color, size, quantity, total, and status fields. Apps Script maps them to the existing sheet columns Order ID, Date, Customer Name, Phone, Address, Product, Color, Size, Quantity, Total, and Status. The script assigns sequential IDs (MIA-001, MIA-002, ...) based on existing orders, keeps each product's size and quantity on matching lines, and formats phone/order ID cells as text. If the ID, customer name, phone, or quantities are wrong, replace all of Code.gs with GoogleAppsScript.gs, save, then deploy a new version. Also upload the updated index.html to your website. New orders will use the corrected fields; older incomplete rows cannot be recovered from the sheet.

The web app must allow public access so customers can submit orders. Anyone with its URL could submit rows, so keep the URL in the site configuration and do not share it separately.\n