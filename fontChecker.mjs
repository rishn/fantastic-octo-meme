/* eslint-disable @typescript-eslint/no-unused-vars */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';


const url = process.argv[2];


if (!url) {
  console.error('URL argument is missing');
  process.exit(1);
}


// Define __dirname for ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));


const complianceFonts = ["Roobert", "Times New Roman"];


(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();


    await page.goto(url, { waitUntil: 'domcontentloaded' });


    console.log("Scrolling through the page to load all content...\n");


    let previousHeight = 0;
    let screenshotIndex = 0;
    const reportDir = join(__dirname, 'compliance_report');
    if (!existsSync(reportDir)) mkdirSync(reportDir);


    const fontReportFilePath = join(reportDir, 'font_report.json');


    // Overwrite report files with empty content
    writeFileSync(fontReportFilePath, JSON.stringify({ date: new Date().toLocaleString(), url, issuesFound: 0, details: [] }, null, 4), 'utf8');
   
    while (true) {
        console.log("Checking for non-compliant fonts and colors...\n");


        const fontDetails = await page.evaluate((complianceFonts) => {
            const elements = document.querySelectorAll('*');
            const nonCompliance = [];


            elements.forEach((el) => {
                const style = window.getComputedStyle(el);
                const fontFamily = style.fontFamily;
                const textContent = el.innerText?.trim() || "[No Visible Text]";


                // Check if the fontFamily does not include any of the compliance fonts
                const isNonCompliant = complianceFonts.every(font => !fontFamily.includes(font));


                if (isNonCompliant && textContent !== "[No Visible Text]") {
                    el.style.outline = "3px solid red";
                    el.style.backgroundColor = "#ffeeee";


                    let hierarchy = [];
                    let parent = el;
                    while (parent) {
                        hierarchy.unshift(parent.tagName.toLowerCase());
                        parent = parent.parentElement;
                    }


                    nonCompliance.push({
                        textContent,
                        tagHierarchy: hierarchy.join(" > "),
                        fontFamily
                    });
                }
            });


            return nonCompliance;
        }, complianceFonts);


        // Append new details to the report files, filtering out duplicates
        const fontReportData = JSON.parse(readFileSync(fontReportFilePath, 'utf8'));
        const existingDetails = fontReportData.details;


        const uniqueFontDetails = fontDetails.filter(detail =>
            !existingDetails.some(existingDetail =>
                existingDetail.textContent === detail.textContent &&
                existingDetail.tagHierarchy === detail.tagHierarchy &&
                existingDetail.fontFamily === detail.fontFamily
            )
        );


        fontReportData.issuesFound += uniqueFontDetails.length;
        fontReportData.details.push(...uniqueFontDetails);
        writeFileSync(fontReportFilePath, JSON.stringify(fontReportData, null, 4), 'utf8');
        console.log("Font report updated: 'compliance_report/font_report.json'");


        // Take a screenshot of the current view with highlighted elements
        try {
            await page.screenshot({
                path: join(reportDir, `window_screenshot_fonts_${screenshotIndex}.png`),
                fullPage: false
            });
            console.log(`Screenshot taken: window_screenshot_fonts_${screenshotIndex}.png`);
        } catch (error) {
            console.error(`Failed to take screenshot: window_screenshot_fonts_${screenshotIndex}.png`);
        }
        screenshotIndex++;


        // Scroll more before taking subsequent screenshots
        let currentHeight = await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
            return document.documentElement.scrollHeight;
        });


        await page.waitForTimeout(1000);


        if (currentHeight === previousHeight) break;
        previousHeight = currentHeight;
    }


    // Take an extra last screenshot after the final scroll
    try {
        await page.screenshot({
            path: join(reportDir, `window_screenshot_fonts_${screenshotIndex}.png`),
            fullPage: false
        });
        console.log(`Extra screenshot taken: window_screenshot_fonts_${screenshotIndex}.png`);
    } catch (error) {
        console.error(`Failed to take extra screenshot: window_screenshot_fonts_${screenshotIndex}.png`);
    }


    // Take a full webpage screenshot covering all highlighted elements
    try {
        await page.screenshot({
            path: join(reportDir, 'fullpage_screenshot_fonts.png'),
            fullPage: true
        });
        console.log("Full webpage screenshot taken: 'fullpage_screenshot_fonts.png'");
    } catch (error) {
        console.error("Failed to take full webpage screenshot: 'fullpage_screenshot_fonts.png'");
    }


    console.log("Finished processing all views.\n");


    await browser.close();
})();
