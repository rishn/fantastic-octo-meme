const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');


const url = process.argv[2];


if (!url) {
  console.error('URL argument is missing');
  process.exit(1);
}


async function captureScreenshotsWithLinks(url, maxLinks = 5) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();


    console.log(`Visiting: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });


    // Create the screenshots directory if it doesn't exist
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }


    await page.screenshot({ path: path.join(screenshotsDir, 'screenshot_main.png'), fullPage: true });
    console.log('Main page screenshot saved: screenshots/screenshot_main.png');


    const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href.startsWith('http'))
            .slice(0, 5);
    });


    console.log(`Found ${links.length} links:`, links);


    for (let i = 0; i < Math.min(links.length, maxLinks); i++) {
        try {
            const link = links[i];
            console.log(`Capturing: ${link}`);
            await page.goto(link, { waitUntil: 'networkidle' });


            const filename = path.join(screenshotsDir, `screenshot_link_${i + 1}.png`);
            await page.screenshot({ path: filename, fullPage: true });
            console.log(`Screenshot saved: ${filename}`);
        } catch (error) {
            console.error(`Failed to capture: ${links[i]} - ${error.message}`);
        }
    }


    await browser.close();
    console.log('All screenshots captured.');
}


captureScreenshotsWithLinks(url);
