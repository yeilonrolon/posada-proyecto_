const puppeteer = require('puppeteer');
const path = require('path');
const ejs = require('ejs');

const renderTemplate = async (templateName, data) => {
    const filePath = path.join(__dirname, 'pdfTemplates', `${templateName}.ejs`);
    return await ejs.renderFile(filePath, data);
};

const generatePdfBuffer = async (templateName, data) => {
    const html = await renderTemplate(templateName, data);
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
    await browser.close();
    return pdfBuffer;
};

module.exports = {
    generatePdfBuffer,
};
