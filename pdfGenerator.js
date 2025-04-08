const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');


// Function to ensure JSON content is added below the image on the same page
async function addContentToPdf(imagePath, jsonPath, title, pdfDoc) {
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);


    // Add a new page for the report
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();


    // Add the title
    page.drawText(title, { x: 50, y: height - 50, size: 18, font: boldFont, color: rgb(0, 0, 0) });


    let yPosition = height - 80;
    const lineHeight = 14;


    // Add the image if provided
    if (imagePath) {
        const imageBytes = fs.readFileSync(imagePath);
        const image = await pdfDoc.embedPng(imageBytes);
        const imageDims = image.scaleToFit(width - 100, height / 2); // Scale image to fit half the page
        page.drawImage(image, {
            x: 50,
            y: yPosition - imageDims.height,
            width: imageDims.width,
            height: imageDims.height,
        });
        yPosition -= imageDims.height + 20; // Adjust yPosition for JSON content
    }


    // Function to recursively process JSON data
    function processJson(data, indent = 0) {
        Object.entries(data).forEach(([key, value]) => {
            if (yPosition < 50) {
                // Add a new page if there's no space left
                page = pdfDoc.addPage();
                yPosition = height - 50;
            }
            const indentSpaces = ' '.repeat(indent * 2);
            const formattedKey = `${indentSpaces}${key}:`;
            page.drawText(formattedKey, { x: 50, y: yPosition, size: 10, font, color: rgb(0, 0, 0) });
            yPosition -= lineHeight;


            if (typeof value === 'object' && value !== null) {
                processJson(value, indent + 1); // Recursively process nested objects
            } else {
                const formattedValue = `${indentSpaces}  ${JSON.stringify(value)}`;
                page.drawText(formattedValue, { x: 50, y: yPosition, size: 10, font, color: rgb(0, 0, 0) });
                yPosition -= lineHeight;
            }
        });
    }


    // Add the JSON content
    if (jsonPath) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        processJson(jsonData);
    }
}
 
async function generatePDF() {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
 
    // Add a title page
    const titlePage = pdfDoc.addPage();
    const { width, height } = titlePage.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    titlePage.drawText('Compliance Report', {
        x: 50,
        y: height - 50,
        size: 24,
        font,
        color: rgb(0, 0, 0),
    });
    await addContentToPdf(null, './compliance_report/case_report.json', 'Case Report', pdfDoc);
    await addContentToPdf('./compliance_report/fullpage_screenshot_fonts.png', './compliance_report/font_report.json', 'Font Report', pdfDoc);
    await addContentToPdf('./compliance_report/fullpage_screenshot_colors.png', './compliance_report/color_report.json', 'Color Report', pdfDoc);
    // Add JSON files in a human-readable format
    const complianceDir = './compliance_report/';
    const files = fs.readdirSync(complianceDir).sort();


    for (const file of files) {
        if (file.startsWith('cv') && file.endsWith('.json')) {
            const imageFile = file.replace('.json', '');
            if (fs.existsSync(`${complianceDir}${imageFile}`)) {
                await addContentToPdf(`${complianceDir}${imageFile}`, `${complianceDir}${file}`, 'CV Report ' + imageFile.replace('.png', '').replace(/_/g, ' '), pdfDoc);
            }
        }
    }
 
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    const outputPath = './compliance_report.pdf';
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`PDF saved at ${outputPath}`);
}
 
// Run the function
generatePDF().catch((err) => console.error(err));
