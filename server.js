const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { generateResponse, loadComplianceReports } = require('./chatbot'); // Import the generateResponse function
 
const app = express();
const PORT = process.env.PORT || 5000;
 
app.use(cors());
app.use(express.json());


// API Tester
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello, the API is working!' });
});
 
// Run the main Python script with the URL as an argument
app.get('/run-main-script', (req, res) => {
  const url = req.query.url;


  const directories = ['./compliance_report', './screenshots'];


  // Function to delete directory and its contents
  const deleteDirectory = (dirPath) => {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach((file) => {
        const currentPath = path.join(dirPath, file);
        if (fs.lstatSync(currentPath).isDirectory()) {
          deleteDirectory(currentPath);
        } else {
          fs.unlinkSync(currentPath);
        }
      });
      fs.rmdirSync(dirPath);
    }
  };


  // Delete the directory and then run the script
  try {
    for (const directory of directories) {
      if (fs.existsSync(directory)) {
        console.log(`Deleting directory: ${directory}`);
        deleteDirectory(directory);
        console.log(`Directory ${directory} deleted successfully.`);
      }
    }
 
    console.log(`Running main script with URL: ${url}`);
    exec(`python main.py ${url}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running main script: ${error}`);
        return res.status(500).json({ error: 'Error running main script' });
      }
      console.log(`Main script output: ${stdout}`);
      res.json({ output: stdout });
    });
  } catch (err) {
    console.error(`Error during deletion or script execution: ${err}`);
    res.status(500).json({ error: 'Error during deletion or script execution' });
  }
});
 
// Get CV reports
app.get('/get-cv-report', (req, res) => {
  const reports = [];
  const complianceReportDir = './compliance_report';
 
  console.log("Starting to scan compliance_report directory...");
  fs.readdir(complianceReportDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${err}`);
      return res.status(500).json({ error: 'Error reading directory' });
    }
 
    files.forEach((file) => {
      console.log(`Checking file: ${file}`);
      if (file.startsWith('cv') && file.endsWith('.png')) {
        const imageName = file;
        const jsonName = `${path.parse(file).name}.png.json`;
        const imagePath = path.join(complianceReportDir, imageName);
        const jsonPath = path.join(complianceReportDir, jsonName);
 
        if (fs.existsSync(imagePath) && fs.existsSync(jsonPath)) {
          console.log(`Found matching files: ${imageName}, ${jsonName}`);
          const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          reports.push({
            image: imageName,
            json_data: jsonData
          });
        }
      }
    });
 
    console.log("Final reports list:");
    console.log(reports);
    res.json(reports);
  });
}); 
// Get case checker reports
app.get('/get-case-report', (req, res) => {
  const reportPath = path.join(__dirname, 'compliance_report', 'case_report.json');
  fs.readFile(reportPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading case report:', err);
      return res.status(500).json({ error: 'Error reading case report' });
    }
    res.json(JSON.parse(data));
  });
});
 
// Get color reports
app.get('/get-color-report', (req, res) => {
  const reports = [];
  const complianceReportDir = './compliance_report';
 
  console.log("Starting to scan compliance_report directory...");
  fs.readdir(complianceReportDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${err}`);
      return res.status(500).json({ error: 'Error reading directory' });
    }
 
    files.forEach((file) => {
      console.log(`Checking file: ${file}`);
      if (file === 'fullpage_screenshot_colors.png') {
        const imageName = file;
        const jsonName = 'color_report.json';
        const imagePath = path.join(complianceReportDir, imageName);
        const jsonPath = path.join(complianceReportDir, jsonName);
 
        if (fs.existsSync(imagePath) && fs.existsSync(jsonPath)) {
          console.log(`Found matching files: ${imageName}, ${jsonName}`);
          const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          reports.push({
            image: imageName,
            json_data: jsonData
          });
        }
      }
    });
 
    console.log("Final reports list:");
    console.log(reports);
    res.json(reports);
  });
});
 
// Get font reports
app.get('/get-font-report', (req, res) => {
  const reports = [];
  const complianceReportDir = './compliance_report';
 
  console.log("Starting to scan compliance_report directory...");
  fs.readdir(complianceReportDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${err}`);
      return res.status(500).json({ error: 'Error reading directory' });
    }
 
    files.forEach((file) => {
      console.log(`Checking file: ${file}`);
      if (file === 'fullpage_screenshot_fonts.png') {
        const imageName = file;
        const jsonName = 'font_report.json';
        const imagePath = path.join(complianceReportDir, imageName);
        const jsonPath = path.join(complianceReportDir, jsonName);
 
        if (fs.existsSync(imagePath) && fs.existsSync(jsonPath)) {
          console.log(`Found matching files: ${imageName}, ${jsonName}`);
          const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          reports.push({
            image: imageName,
            json_data: jsonData
          });
        }
      }
    });
 
    console.log("Final reports list:");
    console.log(reports);
    res.json(reports);
  });
});
 
// Serve image files
app.get('/get-image/:image_name', (req, res) => {
  const imageName = req.params.image_name;
  const imagePath = path.join('./compliance_report', imageName);
 
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
 
  res.sendFile(path.resolve(imagePath));
}); 
// Chatbot endpoint
app.post('/chatbot', async (req, res) => {
  const userInput = req.body.message;
  try {
    const response = await generateResponse(userInput, loadComplianceReports());
    res.json({ response });
  } catch (error) {
    console.error('Error generating chatbot response:', error);
    res.status(500).json({ error: 'Error generating chatbot response' });
  }
});
 
// Serve the generated PDF file as a downloadable file
app.get('/download-pdf', (req, res) => {
  const pdfPath = path.join(__dirname, 'compliance_report.pdf');
 
  // Check if the file exists
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ error: 'PDF file not found' });
  }
 
  // Set headers to make the file downloadable
  res.setHeader('Content-Disposition', 'attachment; filename=compliance_report.pdf');
  res.setHeader('Content-Type', 'application/pdf');
 
  // Send the PDF file
  res.sendFile(pdfPath, (err) => {
    if (err) {
      console.error('Error sending PDF file:', err);
      res.status(500).json({ error: 'Error sending PDF file' });
    }
  });
});
 
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
