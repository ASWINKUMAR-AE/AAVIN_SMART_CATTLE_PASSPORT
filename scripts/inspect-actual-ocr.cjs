const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function main() {
  const imagePath = 'C:/Users/Aswin/.gemini/antigravity-ide/brain/5773f287-c8d6-4ec2-ba1a-c1f6f05d6d43/.user_uploaded/media_1792322141826.jpg';
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath));

  console.log('Sending register image to OCR API http://106.51.21.4/api/v1/ocr/table ...');
  const res = await axios.post('http://106.51.21.4/api/v1/ocr/table', form, {
    headers: form.getHeaders(),
    timeout: 60000,
  });

  const outPath = 'scripts/actual_ocr_response.json';
  fs.writeFileSync(outPath, JSON.stringify(res.data, null, 2), 'utf8');
  console.log('OCR response saved to:', outPath);
  console.log('Response keys:', Object.keys(res.data));
  if (res.data.tables) {
    console.log('Tables count:', res.data.tables.length);
    res.data.tables.forEach((t, i) => {
      console.log(`Table ${i} headers:`, t.headers);
      console.log(`Table ${i} row count:`, t.rows?.length);
      console.log(`Table ${i} first 2 rows:`, JSON.stringify(t.rows?.slice(0, 2)));
    });
  }
}

main().catch(err => {
  console.error('OCR Error:', err.message);
  if (err.response) {
    console.error('Response status:', err.response.status);
    console.error('Response data:', err.response.data);
  }
});
