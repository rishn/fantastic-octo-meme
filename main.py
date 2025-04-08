import requests
import subprocess
import urllib3
import sys
from multiprocessing import Process, Queue


# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# Function to determine if the website uses HTML or JSX
def determine_file_types(url):
    response = requests.get(url, verify=False)  # Disable SSL verification
    content_type = response.headers['Content-Type']
    file_types = []
    if 'text/html' in content_type:
        file_types.append('html')
    if 'application/javascript' in content_type:
        file_types.append('jsx')
    return file_types


# Function to run the case checker
def check_cases(file_type, url, queue):
    result = subprocess.run(['python', 'case_checker.py', url], capture_output=True, text=True, encoding='utf-8')
    if not result:
        queue.put("CaseCheckerJSX didn't run properly.")
    else:
        queue.put(result.stdout)


# Function to run the font checker
def check_fonts(url, queue):
    result = subprocess.run(['node', 'fontChecker.mjs', url], capture_output=True, text=True, encoding='utf-8')
    queue.put(result.stdout)


# Function to run the color checker
def check_colors(url, queue):
    result = subprocess.run(['node', 'colorChecker.mjs', url], capture_output=True, text=True, encoding='utf-8')
    queue.put(result.stdout)


# Function to take screenshots and run the CV script
def take_screenshots_and_run_cv(url, queue):
    screenshot_result = subprocess.run(['node', 'screenshotTaker.js', url], capture_output=True, text=True, encoding='utf-8')
    cv_result = subprocess.run(['python', 'cv_script.py'], capture_output=True, text=True, encoding='utf-8')
    queue.put(cv_result.stdout)


# Main function to integrate all checks
def main(url):
    file_types = determine_file_types(url)
    if not file_types:
        print("Unsupported file type.")
        return


    print("Approach 2: Scraping")
    print("Running case checker...")
   
    case_checker_outputs = {}
    case_checker_queue = Queue()
   
    for file_type in file_types:
        p_case_checker = Process(target=check_cases, args=(file_type, url, case_checker_queue))
        p_case_checker.start()
   
    print("Running font checker...")
    font_checker_queue = Queue()
    p_font_checker = Process(target=check_fonts, args=(url, font_checker_queue))
    p_font_checker.start()


    print("Running color checker...")
    color_checker_queue = Queue()
    p_color_checker = Process(target=check_colors, args=(url, color_checker_queue))
    p_color_checker.start()


    print("Approach 1: CV")
    print("Taking screenshots to run the computer vision program...")
   
    cv_queue = Queue()
    p_cv = Process(target=take_screenshots_and_run_cv, args=(url, cv_queue))
    p_cv.start()


    # Collect results from queues
    for file_type in file_types:
        case_checker_outputs[file_type] = case_checker_queue.get()
   
    font_checker_output = font_checker_queue.get()
    color_checker_output = color_checker_queue.get()
    cv_output = cv_queue.get()


    # Print outputs
    for file_type in file_types:
        print(f"Case Checker Output for {file_type}: {case_checker_outputs[file_type]}")
   
    print(f"Font Checker Output: {font_checker_output}")
    print(f"Color Checker Output: {color_checker_output}")
   
    print("Model ran successfully...")
    print(cv_output)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python main.py <url>")
        sys.exit(1)
   
    website_url = sys.argv[1]


    main(website_url)


    print("Generating PDF report...")
    subprocess.run(['node', 'pdfGenerator.js'], capture_output=True, text=True, encoding='utf-8')
    print("PDF report generated successfully...")
