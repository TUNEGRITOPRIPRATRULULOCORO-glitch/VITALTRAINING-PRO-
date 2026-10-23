const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  const dir = path.join(process.cwd(), 'interfaz', 'img');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));

  for (const file of files) {
    const input = path.join(dir, file);
    const tmp = path.join(dir, `.${file}.tmp`);
    const metadata = await sharp(input).metadata();
    const w = metadata.width || 1280;
    const h = metadata.height || 720;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <rect x="26" y="18" rx="16" width="260" height="58" fill="#22c55e"/>
        <text x="52" y="58" font-size="30" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#ffffff">VitalTraining</text>
        ${file === 'login.png' ? '<text x="504" y="398" font-size="25" font-family="Segoe UI, Arial, sans-serif" fill="#f4f7fb">correo@vitaltraining.com</text>' : ''}
      </svg>
    `;

    await sharp(input)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .toFile(tmp);

    fs.renameSync(tmp, input);
    console.log('updated', file);
  }
})();
