"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var readlineSync = require("readline-sync");
var axios_1 = require("axios");
var fs = require("fs");
var path = require("path");
(0, dotenv_1.config)(); // Load .env variables
var apiKey = process.env.INNOVATE_API_KEY;
if (!apiKey) {
    throw new Error("INNOVATE_API_KEY is missing in .env file");
}
var deploymentId = "gpt-4o-mini";
var apiVersion = "2024-02-01";
var complianceReportsDir = path.join(__dirname, "compliance_report");// Ensure the directory exists
if (!fs.existsSync(complianceReportsDir)) {
    fs.mkdirSync(complianceReportsDir, { recursive: true });
}
// Load compliance reports from JSON files and format them as sections
function loadComplianceReports() {
    var contextString = "";
    // Ensure the directory exists
    if (!fs.existsSync(complianceReportsDir)) {
        fs.mkdirSync(complianceReportsDir, { recursive: true });
    }
    var files = fs.readdirSync(complianceReportsDir);
    //console.log("Files found:", files);
    files.forEach(function (file) {
        if (path.extname(file) === ".json") {
            var filePath = path.join(complianceReportsDir, file);
            var data = fs.readFileSync(filePath, "utf-8");
            try {
                var json = JSON.parse(data);
                var entries = Array.isArray(json) ? json : [json]; // Normalize single object to array
                entries.forEach(function (entry) {
                    var question = entry.question, answer = entry.answer;
                    if (question && answer) {
                        // Add report as a tagged section in the context string
                        contextString += "<".concat(file.replace('.json', ''), ">\n").concat(JSON.stringify(entry, null, 2), "\n</").concat(file.replace('.json', ''), ">\n\n");
                    }
                    else {
                        // Log missing fields but still include the entry for visibility
                        //console.warn(`⚠️ Missing 'question' or 'answer' in ${file}:`, entry);
                        contextString += "<".concat(file.replace('.json', ''), ">\n").concat(JSON.stringify(entry, null, 2), "\n</").concat(file.replace('.json', ''), ">\n\n");
                    }
                });
            }
            catch (err) {
                console.error("\u274C Failed to parse JSON in ".concat(file, ":"), err);
            }
        }
    });
    return contextString;
}
// Chatbot Introduction
function getBotIntroduction() {
    return "Hi, I'm Brand.i, your companion to assist you in ensuring branding consistency for your products. How can I help you today?";
}
// Summarize compliance report in simple language
function summarizeReport(report) {
    return "This report covers key visual identity aspects like layout, logo usage, typography, color palette, UI components and graphic elements. It identifies any violations and provides solutions for improving the webpage design to adhere to branding guidelines.";
}// Generate chatbot response
function generateResponse(query, contextStringFromAPI) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt_1, url, headers, body, response, content, error_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    if (query.toLowerCase() === "summarize report") {
                        return [2 /*return*/, summarizeReport(contextStringFromAPI)];
                    }
                    if (query.toLowerCase() === "introduction") {
                        return [2 /*return*/, getBotIntroduction()];
                    }                    prompt_1 = "\n      You are an AI chatbot, named Brand.i, tasked with assisting users in ensuring their web pages comply with the visual identity and branding guidelines. The user will submit details about their webpage, and you will provide a comprehensive evaluation based on these guidelines.\n      \n      Product Information:\n      - **Name**: Brand.i for FIS\n      - **Tagline**: AI-Powered Precision. Consistent Branding.\n      - **Technologies Used**:\n        - **Computer Vision**: Detects components present on the page using object detection models, infers compliance with guidelines, and provides suggestions to improve UI.\n        - **Web Scraping**: Quickly retrieves properties of the page, such as fonts, colors, and texts used, verifies compliance, and provides suggestions to improve UI.\n      - **Objectives**: \n        - Enhance branding consistency for FIS.\n        - Elevate brand outreach and visibility.\n        - Ensure a cohesive and unified brand vision.\n        - Address and resolve any branding compliance issues with FIS products.\n      \n      Evaluation Criteria Based on the Visual Identity Guidelines:\n \n      System Layout:\n      - Does the layout balance vibrancy and simplicity while focusing on clarity and flexibility?\n      - Is there an appropriate amount of whitespace throughout the design?\n      - Is the design clean, modern, and uncluttered, with open layouts?\n      - Ensure content is spaced appropriately without any clutter.\n \n      Grid Structure:\n      - Are the margins set by dividing the short edge by 14?\n      - Does the layout include a 30x30 grid within the margins?\n \n      Logo and Tagline Usage:\n      - Is the logo and tagline used correctly (i.e., in the footer or on a single-page communication, or in stacked form for constrained layouts)?\n      - Is the logo used in its appropriate color form, and is the clear space around it sufficient (equal to the width of the \u2018S\u2019 in the logo)?\n      - Is the logo size adhered to (minimum height: 0.25 inches in print or 18 pixels on screen)?\n      - Are the prohibited uses of the logo avoided (e.g., no rotation, no manual lockups)?\n      - Is the tagline used correctly (font: Roobert Bold, sentence case, correct line breaks, and trademark symbol)?\n \n      Color Palette:\n      - Does the webpage adhere to the primary color palette (eggplant, navy), secondary colors (raspberry, charcoal, grey), tertiary colors (black, white) and accent color (core green)?\n      - Is the gradient usage followed correctly, with a 100% Green starting point and decreasing opacity evenly in denominators?\n \n      Typography:\n      - Is the correct typeface (Roobert, with Aptos as a substitute for desktop applications) used throughout the webpage? If Aptos is mentioned, ensure to specify that it can only be used as a substitute for desktop applications when Roobert is not available.\n      - Are the hierarchy rules followed for headlines (sentence case), subheads (sentence case), body copy (sentence case), and call-to-action buttons (all caps)?\n      - Does the text color treatment follow the guidelines (white text on eggplant or navy background, navy text on grey background)?\n\n      Graphic Elements:\n      - Are circular shapes used appropriately as design anchors or icons, and do they overlay images effectively to add depth and contrast?\n      - Are green icons used for conceptual ideas, and are icons serving as containers for imagery?\n      - Do dot graphics follow the scaling and opacity guidelines? (e.g., large dot at 40% opacity, second dot at 70%, third dot at 100% opacity)\n      - When dot graphics overlap with photos, is the multiplied effect applied, and are faces in the photo avoided?\n \n      Response Steps for Faults:\n \n      - If any part of the webpage violates the guidelines, the chatbot should guide the user with clear steps to resolve the issue.\n      - For example:\n \n        System Layout:\n        Fault: \"The layout is too cluttered and lacks whitespace.\"\n        Solution: \"Ensure that you introduce generous whitespace between sections of content. Use open layouts with sufficient spacing, and avoid overloading any single section with too many elements. Simplify the content presentation.\"\n \n        Logo and Tagline Usage:\n        Fault: \"The logo is being rotated or manually adjusted.\"\n        Solution: \"Ensure that the logo appears in its original orientation and is not manually adjusted. Maintain the clear space around the logo equal to the width of the 'S'. Use the logo in color, and only use black logos when absolutely necessary.\"\n        Fault: \"The logo does not have enough clear space around it.\"\n        Solution: \"Ensure that the logo appears in its original orientation and is not manually adjusted. Maintain the clear space around the logo equal to the width of the 'S'. Use the logo in color, and only use black logos when absolutely necessary.\"\n \n        Color Palette:\n        Fault: \"You are using a color outside the defined FIS color palette.\"\n        Solution: \"Please use colors from the approved palette only. Refer to the primary colors (eggplant, navy), secondary colors (raspberry, charcoal, grey), tertiary colors (black, white) and accent color (core green) to maintain consistency with the brand's visual identity.\"\n \n        Typography:\n        Fault: \"The headlines are in uppercase rather than sentence case.\"\n        Solution: \"Update the text to use sentence case for headlines and subheads. Use the Roobert font for the body copy.\"\n        Fault: \"The buttons are in sentence case rather than uppercase.\"\n        Solution: \"Ensure that call-to-action buttons are in all caps, and use the Roobert font for the body copy.\"\n        Fault: \"The body copy is not using the correct typeface.\"\n        Solution: \"Ensure that the body copy uses the Roobert font. If Roobert is not available, use Aptos as a substitute for desktop applications. This will maintain consistency with the brand's visual identity.\"\n\n        Graphic Elements:\n        Fault: \"The dot graphics are not using the correct opacity.\"\n        Solution: \"Ensure the dots are created with 40% opacity for the large dot, 70% for the second dot, and 100% for the third. When overlapping photos, use the multiplied effect and avoid using faces in the photos.\"\n \n      This detailed prompt allows the bot to evaluate the user's webpage based on the provided guidelines and offer concrete steps to resolve issues in compliance.\n \n      Additionally, the reports the bot is reading are in .json format and it should be able to summarize them in simple language in less than 5-6 lines. If the JSON reports are not found, inform the user that the reports from the last analysis cannot be found and suggest running the tool on the page again.\n      \n      If a query is asked beyond the knowledge base, please redirect the user to [Brandzone hub - FIS Global](https://brandzone.fisglobal.com/hub/15).\n \n      <context>\n      ".concat(contextStringFromAPI, "\n      </context>\n \n      Answer questions using these reports in a professional tone. Use HTML tags like <br>, <li>, <ol>, and <ul> to format your responses for better readability.\n \n      User: ").concat(query, "\n      Bot:");                    url = "https://innovate-openai-api-mgt.azure-api.net/innovate-tracked/deployments/".concat(deploymentId, "/chat/completions?api-version=").concat(apiVersion);
                    headers = {
                        "Content-Type": "application/json",
                        "Cache-Control": "no-cache",
                        "api-key": apiKey,
                    };
                    body = {
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: prompt_1 }],
                    };
                    return [4 /*yield*/, axios_1.default.post(url, body, { headers: headers })];
                case 1:
                    response = _d.sent();
                    content = (_c = (_b = (_a = response.data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content;
                    return [2 /*return*/, typeof content === "string" ? content.trim() : "No valid response received."];
                case 2:
                    error_1 = _d.sent();
                    console.error("Error generating response:", error_1);
                    return [2 /*return*/, "I'm having trouble responding at the moment."];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Summarize compliance report in simple language
function summarizeReport(report) {
    return "This report covers key visual identity aspects like layout, logo usage, typography, color palette, UI components and graphic elements. It identifies any violations and provides solutions for improving the webpage design to adhere to branding guidelines.";
}// Start chatbot interaction
function startChatbot() {
    return __awaiter(this, void 0, void 0, function () {
        var userInput, reportSummary, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("💬 Chatbot started! Type 'exit' to stop.");
                    console.log(getBotIntroduction());
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 5];
                    userInput = readlineSync.question("\nYou: ");
                    if (userInput.toLowerCase() === "exit") {
                        console.log("👋 Goodbye!");
                        return [3 /*break*/, 5];
                    }
                    if (!(userInput.toLowerCase() === "summarize report")) return [3 /*break*/, 2];
                    reportSummary = summarizeReport(contextString);
                    console.log("Bot: ", reportSummary);
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, generateResponse(userInput)];
                case 3:
                    response = _a.sent();
                    console.log("Bot:", response);
                    _a.label = 4;
                case 4: return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// At the end of chatbot.js
module.exports = {
    generateResponse,
    loadComplianceReports
};  
