from playwright.sync_api import sync_playwright
import sys
import os
import json


def check_button_case_compliance_hidden(url, output_file):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            page.goto(url)
            page.wait_for_load_state("networkidle")


            buttons = page.query_selector_all('button')
            anchors = page.query_selector_all('a[class*="btn"]')


            compliance_report = []


            def check_case(text):
                if text.isupper():
                    return "Uppercase", True, "No changes needed."
                elif text.islower():
                    return "Lowercase", False, "Change to Sentence case or Uppercase."
                elif text[0].isupper() and text[1:].islower():
                    return "Sentence case", False, "Change to Uppercase."
                else:
                    return "Mixed case", False, "Change to Sentence case or Uppercase."


            for button in buttons:
                text = button.inner_text().strip()
                if text:
                    case, is_valid, message = check_case(text)
                    compliance_report.append({
                        "component": "button",
                        "text": text,
                        "case": case,
                        "is_valid": is_valid,
                        "message": message
                    })


            for anchor in anchors:
                text = anchor.inner_text().strip()
                if text:
                    case, is_valid, message = check_case(text)
                    compliance_report.append({
                        "component": "anchor",
                        "text": text,
                        "case": case,
                        "is_valid": is_valid,
                        "message": message
                    })


            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(compliance_report, f, ensure_ascii=False, indent=4)


        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            browser.close()


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python PlaywrightButtonCaseCheckerHidden.py <URL>")
    else:
        url = sys.argv[1]
        output_dir = 'compliance_report'
        output_file = os.path.join(output_dir, 'case_report.json')


        # Create the directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)


        check_button_case_compliance_hidden(url, output_file)
