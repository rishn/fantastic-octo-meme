import os
import cv2
import numpy as np
import matplotlib.pyplot as plt
from ultralytics import YOLO
import json


# Define file paths
EAST_MODEL_PATH = "./frozen_east_text_detection.pb"
MODEL_PATH = "./yolov8_model.pt"
IMAGE_DIR = "./screenshots"


# Load models
east_net = cv2.dnn.readNet(EAST_MODEL_PATH)
model = YOLO(MODEL_PATH)


def detect_text_east(image):
    # Function to detect text regions using the EAST text detector
    orig = image.copy()
    (H, W) = image.shape[:2]
    newW, newH = (W // 32) * 32, (H // 32) * 32
    rW, rH = W / float(newW), H / float(newH)


    image = cv2.resize(image, (newW, newH))
    blob = cv2.dnn.blobFromImage(image, 1.0, (newW, newH), (123.68, 116.78, 103.94), swapRB=True, crop=False)
    east_net.setInput(blob)


    scores, geometry = east_net.forward(["feature_fusion/Conv_7/Sigmoid", "feature_fusion/concat_3"])
    rects, confidences = [], []
    for y in range(scores.shape[2]):
        for x in range(scores.shape[3]):
            if scores[0, 0, y, x] < 0.5:
                continue
            offsetX, offsetY = x * 4.0, y * 4.0
            angle = geometry[0, 4, y, x]
            cos, sin = np.cos(angle), np.sin(angle)
            h, w = geometry[0, 0, y, x] + geometry[0, 2, y, x], geometry[0, 1, y, x] + geometry[0, 3, y, x]
            endX, endY = int(offsetX + (cos * geometry[0, 1, y, x]) + (sin * geometry[0, 2, y, x])), int(offsetY - (sin * geometry[0, 1, y, x]) + (cos * geometry[0, 2, y, x]))
            startX, startY = int(endX - w), int(endY - h)
            rects.append((startX, startY, endX, endY))
            confidences.append(float(scores[0, 0, y, x]))


    boxes = cv2.dnn.NMSBoxes(rects, confidences, score_threshold=0.5, nms_threshold=0.4)
    return [(rects[i]) for i in boxes.flatten()] if len(boxes) > 0 else []


def detect_and_draw_lines(image):
    """ Detects only straight horizontal and vertical lines, ensuring high contrast for blue headers.
        Returns detected line coordinates for further processing. """
 
    # Convert to HSV to isolate the blue header
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lower_blue = np.array([90, 50, 50])   # Adjust these values if needed
    upper_blue = np.array([130, 255, 255])
    mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)


    # Convert to grayscale, but prioritize the blue channel for better contrast
    blue_channel = image[:, :, 0]  # Extract blue channel
    enhanced_gray = cv2.addWeighted(blue_channel, 1.5, mask_blue, 0.5, 0)  # Boost blue contrast


    # Apply adaptive thresholding for improved edge detection
    binary = cv2.adaptiveThreshold(enhanced_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 11, 2)


    # Edge detection using Canny with adaptive thresholds
    edges = cv2.Canny(binary, 30, 200)  # Adjusted thresholds


    # Use Hough Line Transform to detect only straight lines
    lines = cv2.HoughLinesP(edges, rho=1, theta=np.pi/180, threshold=80,
                            minLineLength=50, maxLineGap=5)  # Adjusted for smaller headers


    detected_lines = []  # Store detected lines


    # Draw detected lines in yellow and store them
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]


            # Only store and draw strictly horizontal or vertical lines
            if abs(x1 - x2) < 5 or abs(y1 - y2) < 5:
                cv2.line(image, (x1, y1), (x2, y2), (0, 255, 255), 2)  # Yellow
                detected_lines.append((x1, y1, x2, y2))


    return detected_lines  # Return list of detected lines


def draw_perpendicular_lines(image, ref_box, detections):
    # Function to draw perpendicular lines and calculate distances
    x1, y1, x2, y2 = ref_box
    center_x, center_y = (x1 + x2) // 2, (y1 + y2) // 2


    distances = {}  # Store distances for all directions


    # Define four movement directions: Up, Down, Left, Right
    directions = {
        "Up": (center_x, y1, center_x, 0),     # From top boundary to box top
        "Down": (center_x, y2, center_x, image.shape[0]),  # From box bottom to image bottom
        "Left": (x1, center_y, 0, center_y),   # From left boundary to box left
        "Right": (x2, center_y, image.shape[1], center_y)  # From box right to image right
    }
    # Convert detected lines into obstacles (small-width bounding boxes)
    line_obstacles = []
    for (lx1, ly1, lx2, ly2) in detections:
        if abs(lx1 - lx2) < 5:  # Vertical line
            line_obstacles.append((lx1 - 2, min(ly1, ly2), lx1 + 2, max(ly1, ly2)))  # Small-width box
        elif abs(ly1 - ly2) < 5:  # Horizontal line
            line_obstacles.append((min(lx1, lx2), ly1 - 2, max(lx1, lx2), ly1 + 2))  # Small-height box


    # Combine text boxes, YOLO boxes, and detected lines
    all_obstacles = detections + line_obstacles


    for direction, (x_start, y_start, x_end, y_end) in directions.items():
        # Initialize final end coordinates
        final_x, final_y = x_end, y_end


        # Check for obstacles in the path
        for (bx1, by1, bx2, by2) in all_obstacles:
            if "Up" in direction and bx1 <= center_x <= bx2 and by2 < y1:
                final_y = max(final_y, by2)  # Stop at the closest component **above**
            elif "Down" in direction and bx1 <= center_x <= bx2 and by1 > y2:
                final_y = min(final_y, by1)  # Stop at the closest component **below**
            elif "Left" in direction and by1 <= center_y <= by2 and bx2 < x1:
                final_x = max(final_x, bx2)  # Stop at the closest component **to the right**
            elif "Right" in direction and by1 <= center_y <= by2 and bx1 > x2:
                final_x = min(final_x, bx1)  # Stop at the closest component **to the left**


        # Draw the final adjusted line
        cv2.line(image, (x_start, y_start), (final_x, final_y), (0, 255, 0), 2)


        # Calculate and store distance
        distance = abs(final_y - y_start) if "Up" in direction or "Down" in direction else abs(final_x - x_start)
        distances[direction] = distance


        # Ensure text does not go out of bounds
        text_x, text_y = max(5, min(final_x, image.shape[1] - 50)), max(15, min(final_y, image.shape[0] - 5))
        cv2.putText(image, f"{distance}px", (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)


    bbox_size = max(x2 - x1, y2 - y1)  # Take the larger dimension as size
    min_clearance = bbox_size / 3.5  # Bounding box length of clear space required


    print(f"Bounding Box size: {bbox_size}px\tMinimum clearance: {min_clearance}px")


    # Ensure bounding box size is more than 18 pixels
    if bbox_size <= 18:
        print(f"Bounding Box ({x1}, {y1}, {x2}, {y2}) is too small (Size: {bbox_size}px) - INVALID")
        return False, min_clearance, [], "Bounding box is too small. Increase the size of the bounding box."


    # Check if all distances are greater than min_clearance
    failed_directions = [direction for direction, distance in distances.items() if distance <= min_clearance]
    if not failed_directions:
        print(f"Bounding Box ({x1}, {y1}, {x2}, {y2}) - Distances: {distances} - VALID")
        return True, min_clearance, [], "All clearances are valid."
    else:
        improvement_suggestions = [f"{direction}: Increase by {min_clearance - distances[direction]:.2f}px" for direction in failed_directions]
        suggestion = f"Increase clearance in the following directions: {', '.join(improvement_suggestions)}."
        print(f"Bounding Box ({x1}, {y1}, {x2}, {y2}) - Distances: {distances} - INVALID")
        return False, min_clearance, failed_directions, suggestion


# Ensure output directory exists
OUTPUT_DIR = "compliance_report"
os.makedirs(OUTPUT_DIR, exist_ok=True)


# Generate 21 distinct colors for different labels
np.random.seed(42)
class_colors = {i: tuple(np.random.randint(0, 255, 3).tolist()) for i in range(21)}


# Process images
image_files = [os.path.join(IMAGE_DIR, f) for f in os.listdir(IMAGE_DIR) if f.endswith(('.png', '.jpg', '.jpeg'))]
for image_file in image_files:
    img = cv2.imread(image_file)
    results = model(image_file)
    text_boxes = detect_text_east(img)


    detected_lines = detect_and_draw_lines(img)
    yolo_boxes = []
    good_logo_boxes = []
    good_components = []
    bad_components = []


    for result in results[0].boxes:
        x1, y1, x2, y2 = map(int, result.xyxy[0].tolist())
        label_index = int(result.cls[0].item())
        label = model.names[label_index]
        color = class_colors[label_index]


        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        cv2.putText(img, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)


        if label.startswith("good_"):
            good_components.append({"label": label, "bbox": (x1, y1, x2, y2)})
            if label == "good_logo":
                good_logo_boxes.append((x1, y1, x2, y2))
        elif label.startswith("bad_"):
            bad_components.append({"label": label, "bbox": (x1, y1, x2, y2)})


        yolo_boxes.append((x1, y1, x2, y2))
   
    for (tx1, ty1, tx2, ty2) in text_boxes:
        cv2.rectangle(img, (tx1, ty1), (tx2, ty2), (0, 255, 255), 1)  # Yellow for text


    clear_space_results = []
    for good_logo_box in good_logo_boxes:
        valid, min_clearance, failed_directions, suggestion = draw_perpendicular_lines(img, good_logo_box, yolo_boxes + text_boxes + detected_lines)
        clear_space_results.append({
            "bbox": good_logo_box,
            "valid": valid,
            "min_clearance": f"{min_clearance:.2f}px",
            "failed_directions": failed_directions,
            "suggestion": suggestion
        })




    plt.figure(figsize=(8, 6))
    plt.imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    plt.axis("off")
    plt.title(f"Detections for {os.path.basename(image_file)}")


    # Save the image instead of showing it
    print("annotated Image being stored to path defined in branding.py")
    output_path = os.path.join("./compliance_report", f"cv_{os.path.basename(image_file)}")
    plt.savefig(output_path, bbox_inches='tight')
    plt.close()  # Close the figure to free up memory


    # Output separate JSON file for each image
    output_data = {
        "image": os.path.basename(image_file),
        "good_components": good_components,
        "bad_components": bad_components,
        "clear_space_validation": clear_space_results,
        "message": f"Detected {len(bad_components)} bad components. Consider improving: {', '.join([c['label'] for c in bad_components])}." if len(bad_components) else "Everything looks good. No bad components detected."
    }


    output_json_path = os.path.join("compliance_report", f"cv_{os.path.basename(image_file)}.json")
    with open(output_json_path, "w") as json_file:
        json.dump(output_data, json_file, indent=4)


    print(f"Results saved to {output_json_path}")