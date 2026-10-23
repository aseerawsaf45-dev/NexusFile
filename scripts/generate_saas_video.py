import os
import sys
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio

def get_font(size, bold=False):
    # Try Windows system fonts
    font_paths = [
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\calibri.ttf",
    ]
    if bold:
        font_paths = [
            "C:\\Windows\\Fonts\\segoeuib.ttf",
            "C:\\Windows\\Fonts\\arialbd.ttf",
            "C:\\Windows\\Fonts\\calibrib.ttf",
        ] + font_paths

    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()

def create_gradient_bg(width, height, color1=(10, 15, 29), color2=(17, 24, 39)):
    im = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(im)
    for y in range(height):
        r = int(color1[0] + (color2[0] - color1[0]) * (y / height))
        g = int(color1[1] + (color2[1] - color1[1]) * (y / height))
        b = int(color1[2] + (color2[2] - color1[2]) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return im

def fit_and_center_image(img_path, target_width, target_height, zoom=1.0):
    if not os.path.exists(img_path):
        return Image.new("RGB", (target_width, target_height), (15, 23, 42))
    
    orig = Image.open(img_path).convert("RGB")
    orig_w, orig_h = orig.size
    
    # Calculate scale to fit within target
    scale = min((target_width * 0.92) / orig_w, (target_height * 0.72) / orig_h) * zoom
    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)
    
    resized = orig.resize((new_w, new_h), Image.Resampling.LANCZOS)
    return resized

def generate_video(output_mp4_path="NexusFile-SaaS-Categories-Demo.mp4"):
    print(f"Generating SaaS Category Video at: {output_mp4_path}")
    WIDTH, HEIGHT = 1280, 720
    FPS = 30
    
    # Base screenshot paths
    banner_img = "docs/screenshots/saas-video-banner.png"
    dashboard_img = "docs/screenshots/dashboard.png"
    explorer_img = "docs/screenshots/file-explorer.png"
    storage_img = "docs/screenshots/storage-analyzer.png"
    cleaner_img = "docs/screenshots/cache-cleaner.png"
    
    # Fonts
    font_hero = get_font(38, bold=True)
    font_title = get_font(28, bold=True)
    font_subtitle = get_font(18, bold=False)
    font_badge = get_font(14, bold=True)
    font_mono = get_font(13, bold=False)
    
    scenes = [
        {
            "name": "Intro & Brand",
            "img": banner_img,
            "badge": "SAAS CATEGORY PLATFORM",
            "badge_color": (168, 85, 247), # Purple
            "title": "⚡ NexusFile — High-Performance Storage Studio",
            "subtitle": "Next-Generation Automated File Sorting, Probing & Disk Management",
            "duration": 4.5,
        },
        {
            "name": "1-Click Control Center",
            "img": dashboard_img,
            "badge": "CONTROL CENTER",
            "badge_color": (14, 165, 233), # Cyan
            "title": "Instant 1-Click Folder Automation",
            "subtitle": "Sort gigabytes of messy Downloads or project directories in milliseconds",
            "duration": 4.5,
        },
        {
            "name": "SaaS Category Engine",
            "img": explorer_img,
            "badge": "MULTI-SIGNAL CATEGORIES",
            "badge_color": (249, 115, 22), # Orange
            "title": "Codebases, Codes, AI Models & Torrents",
            "subtitle": "Deep magic byte verification + Root codebase markers (package.json, Cargo, Git)",
            "duration": 5.5,
        },
        {
            "name": "Storage Analyzer",
            "img": storage_img,
            "badge": "DEEP STORAGE STUDIO",
            "badge_color": (16, 185, 129), # Emerald
            "title": "Hierarchical TreeMap & Top 50 Largest Files",
            "subtitle": "Direct Windows Win32 API live drive probing down to the exact byte",
            "duration": 4.5,
        },
        {
            "name": "Safe Cleaner & Undo",
            "img": cleaner_img,
            "badge": "ZERO DATA LOSS GUARANTEE",
            "badge_color": (244, 63, 94), # Rose
            "title": "3-Tier Safe Cache Cleaner & 1-Click Reversible Undo",
            "subtitle": "Non-destructive quarantine, collision policies & SHA-256 audit restoration",
            "duration": 4.5,
        },
        {
            "name": "SaaS Call to Action",
            "img": banner_img,
            "badge": "AVAILABLE NOW ON GITHUB",
            "badge_color": (245, 158, 11), # Amber
            "title": "Keep Your Drives Pristine Automatically",
            "subtitle": "github.com/aseerawsaf45-dev/NexusFile  •  Windows 10 / 11",
            "duration": 4.5,
        },
    ]
    
    total_duration = sum(s["duration"] for s in scenes)
    total_frames = int(total_duration * FPS)
    print(f"Total video duration: {total_duration:.1f}s ({total_frames} frames @ {FPS}fps)")
    
    writer = imageio.get_writer(
        output_mp4_path,
        fps=FPS,
        codec='libx264',
        quality=8,
        pixelformat='yuv420p'
    )
    
    current_frame = 0
    
    for s_idx, scene in enumerate(scenes):
        scene_frames = int(scene["duration"] * FPS)
        img_path = scene["img"]
        
        for f in range(scene_frames):
            progress = f / scene_frames
            # Subtle smooth zoom: 1.0 to 1.05
            zoom = 1.0 + (progress * 0.04)
            
            # Base background
            frame = create_gradient_bg(WIDTH, HEIGHT, (10, 15, 30), (15, 23, 42))
            draw = ImageDraw.Draw(frame)
            
            # Ambient top glowing strip
            top_color = scene["badge_color"]
            draw.rectangle([(0, 0), (WIDTH, 4)], fill=top_color)
            
            # Header Badge Pill
            badge_text = scene["badge"]
            badge_bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
            badge_w = badge_bbox[2] - badge_bbox[0] + 20
            badge_h = 28
            badge_x = 50
            badge_y = 30
            
            draw.rounded_rectangle(
                [(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)],
                radius=14,
                fill=(top_color[0]//4, top_color[1]//4, top_color[2]//4),
                outline=top_color,
                width=1
            )
            draw.text((badge_x + 10, badge_y + 6), badge_text, font=font_badge, fill=top_color)
            
            # Title & Subtitle
            draw.text((50, 68), scene["title"], font=font_title, fill=(255, 255, 255))
            draw.text((50, 104), scene["subtitle"], font=font_subtitle, fill=(148, 163, 184))
            
            # Screenshot presentation card
            screenshot = fit_and_center_image(img_path, WIDTH, HEIGHT, zoom=zoom)
            sw, sh = screenshot.size
            sx = (WIDTH - sw) // 2
            sy = 145 + int(math.sin(progress * math.pi) * 4) # subtle float
            
            # Drop shadow & card border
            shadow_margin = 8
            draw.rounded_rectangle(
                [(sx - 2, sy - 2), (sx + sw + 2, sy + sh + 2)],
                radius=12,
                outline=(top_color[0]//2, top_color[1]//2, top_color[2]//2),
                width=2
            )
            
            # Paste screenshot
            frame.paste(screenshot, (sx, sy))
            
            # Global Progress Bar at bottom
            global_pct = current_frame / total_frames
            draw.rectangle([(0, HEIGHT - 6), (int(WIDTH * global_pct), HEIGHT)], fill=top_color)
            
            # Subtitle ticker watermark
            wm_text = "NexusFile SaaS Video Demo • github.com/aseerawsaf45-dev/NexusFile"
            draw.text((WIDTH - 440, HEIGHT - 24), wm_text, font=font_mono, fill=(100, 116, 139))
            
            # Append frame
            writer.append_data(np.array(frame))
            current_frame += 1
            
            if current_frame % 60 == 0:
                print(f"Rendered {current_frame}/{total_frames} frames ({int(current_frame/total_frames*100)}%)...")
                
    writer.close()
    file_size_mb = os.path.getsize(output_mp4_path) / (1024 * 1024)
    print(f"SUCCESS! Video created: {output_mp4_path} ({file_size_mb:.2f} MB)")
    return output_mp4_path

if __name__ == "__main__":
    out = "NexusFile-SaaS-Categories-Demo.mp4"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    generate_video(out)
