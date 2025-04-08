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


// Compliant color palette
const compliantColors = [
    { name: "Eggplant", hex: "#431c5b", rgb: "rgb(67, 28, 91)" },
    { name: "Navy", hex: "#1d1f48", rgb: "rgb(29, 31, 72)" },
    { name: "Raspberry", hex: "#b21a53", rgb: "rgb(178, 26, 83)" },
    { name: "Charcoal", hex: "#3d3d40", rgb: "rgb(61, 61, 64)" },
    { name: "Grey", hex: "#e6e7e8", rgb: "rgb(230, 231, 232)" },
    { name: "Black", hex: "#000000", rgb: "rgb(0, 0, 0)" },
    { name: "White", hex: "#ffffff", rgb: "rgb(255, 255, 255)" },
    { name: "Core Green", hex: "#4bcd3e", rgb: "rgb(75, 205, 62)" }
];


(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();


    await page.goto(url, { waitUntil: 'domcontentloaded' });


    console.log("Scrolling through the page to load all content...\n");


    let previousHeight = 0;
    let screenshotIndex = 0;
    const reportDir = join(__dirname, 'compliance_report');
    if (!existsSync(reportDir)) mkdirSync(reportDir);


    const colorReportFilePath = join(reportDir, 'color_report.json');


    // Overwrite report files with empty content
    writeFileSync(colorReportFilePath, JSON.stringify({ date: new Date().toLocaleString(), url, issuesFound: 0, details: [] }, null, 4), 'utf8');
   
    while (true) {
        console.log("Checking for non-compliant colors...\n");


        const colorDetails = await page.evaluate((compliantColors) => {
            const elements = document.querySelectorAll('*');
            const nonCompliantColors = [];
       
            elements.forEach((el) => {
                const style = window.getComputedStyle(el);
                const backgroundColor = style.backgroundColor;
                const color = style.color;
                const borderColor = style.borderColor;
                const textContent = el.innerText?.trim();
       
                if (!textContent || textContent.length === 0) return; // Skip elements without visible text
       
                const isBackgroundCompliant = compliantColors.some(c => c.rgb === backgroundColor);
                const isTextCompliant = compliantColors.some(c => c.rgb === color);
                const isBorderCompliant = compliantColors.some(c => c.rgb === borderColor);
       
                if (!isBackgroundCompliant && backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    el.style.outline = "3px solid rgb(164, 0, 229)";
                    el.style.backgroundColor = "rgba(209, 95, 253, 0.4)";
       
                    let hierarchy = [];
                    let parent = el;
                    while (parent) {
                        hierarchy.unshift(parent.tagName.toLowerCase());
                        parent = parent.parentElement;
                    }
       
                    nonCompliantColors.push({
                        type: "Background",
                        colorValue: backgroundColor,
                        textContent,
                        tagHierarchy: hierarchy.join(" > ")
                    });
                }
       
                if (!isTextCompliant && color !== 'rgba(0, 0, 0, 0)') {
                    el.style.outline = "3px solid rgb(164, 0, 229)";
                    el.style.backgroundColor = "rgba(209, 95, 253, 0.4)";
                    let hierarchy = [];
                    let parent = el;
                    while (parent) {
                        hierarchy.unshift(parent.tagName.toLowerCase());
                        parent = parent.parentElement;
                    }
       
                    nonCompliantColors.push({
                        type: "Text",
                        colorValue: color,
                        textContent,
                        tagHierarchy: hierarchy.join(" > ")
                    });
                }       
                if (!isBorderCompliant && borderColor !== 'rgba(0, 0, 0, 0)') {
                    el.style.outline = "3px solid rgb(164, 0, 229)";
                    el.style.backgroundColor = "rgba(209, 95, 253, 0.4)";
                    let hierarchy = [];
                    let parent = el;
                    while (parent) {
                        hierarchy.unshift(parent.tagName.toLowerCase());
                        parent = parent.parentElement;
                    }
       
                    nonCompliantColors.push({
                        type: "Border",
                        colorValue: borderColor,
                        textContent,
                        tagHierarchy: hierarchy.join(" > ")
                    });
                }
            });
       
            return nonCompliantColors;
        }, compliantColors);


        const colorReportData = JSON.parse(readFileSync(colorReportFilePath, 'utf8'));
        colorReportData.issuesFound += colorDetails.length;
        colorReportData.details.push(...colorDetails);
        writeFileSync(colorReportFilePath, JSON.stringify(colorReportData, null, 4), 'utf8');
        console.log("Color report updated: 'compliance_report/color_report.json'");


        // Take a screenshot of the current view with highlighted elements
        try {
            await page.screenshot({
                path: join(reportDir, `window_screenshot_colors_${screenshotIndex}.png`),
                fullPage: false
            });
            console.log(`Screenshot taken: window_screenshot_colors_${screenshotIndex}.png`);
        } catch (error) {
            console.error(`Failed to take screenshot: window_screenshot_colors_${screenshotIndex}.png`);
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
            path: join(reportDir, `window_screenshot_colors_${screenshotIndex}.png`),
            fullPage: false
        });
        console.log(`Extra screenshot taken: window_screenshot_colors_${screenshotIndex}.png`);
    } catch (error) {
        console.error(`Failed to take extra screenshot: window_screenshot_colors_${screenshotIndex}.png`);
    }


    // Take a full webpage screenshot covering all highlighted elements
    try {
        await page.screenshot({
            path: join(reportDir, 'fullpage_screenshot_colors.png'),
            fullPage: true
        });
        console.log("Full webpage screenshot taken: 'fullpage_screenshot_colors.png'");
    } catch (error) {
        console.error("Failed to take full webpage screenshot: 'fullpage_screenshot_colors.png'");
    }


    console.log("Finished processing all views.\n");


    await browser.close();
})();
