from PIL import Image
import os

# Source logo
source_path = "assets/splash.png"
if not os.path.exists(source_path):
    print(f"Error: {source_path} not found")
    exit(1)

logo = Image.open(source_path).convert("RGBA")
# ios/App/App/Assets.xcassets/Splash.imageset/Contents.json
sizes = {
    "ios_2732": 2732,
    "android_ldpi": 320,
    "android_mdpi": 480,
    "android_hdpi": 800,
    "android_xhdpi": 1280,
    "android_xxhdpi": 1920,
    "android_xxxhdpi": 2560,
}

output_dir = "/tmp/splash_generated_v3"
os.makedirs(output_dir, exist_ok=True)

for name, size in sizes.items():
    # Create white background
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    
    # Scale logo to ~40% of canvas size
    target_logo_size = int(size * 0.4)
    scaled_logo = logo.resize((target_logo_size, target_logo_size), Image.LANCZOS)
    
    # Center the logo
    x = (size - target_logo_size) // 2
    y = (size - target_logo_size) // 2
    
    # Paste
    canvas.paste(scaled_logo, (x, y), scaled_logo)
    
    # Save as RGB
    final = canvas.convert("RGB")
    final.save(f"{output_dir}/{name}.png", "PNG")
    print(f"Generated {name}.png")

# Landscape Android
for density, short_side in [("ldpi", 320), ("mdpi", 480), ("hdpi", 800), ("xhdpi", 1280), ("xxhdpi", 1920), ("xxxhdpi", 2560)]:
    long_side = int(short_side * 1.78)
    canvas = Image.new("RGBA", (long_side, short_side), (255, 255, 255, 255))
    target_logo_size = int(short_side * 0.4)
    scaled_logo = logo.resize((target_logo_size, target_logo_size), Image.LANCZOS)
    x = (long_side - target_logo_size) // 2
    y = (short_side - target_logo_size) // 2
    canvas.paste(scaled_logo, (x, y), scaled_logo)
    final = canvas.convert("RGB")
    final.save(f"{output_dir}/android_land_{density}.png", "PNG")
    print(f"Generated android_land_{density}.png")
