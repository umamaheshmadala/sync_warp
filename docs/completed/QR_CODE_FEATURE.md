# QR Code Generation Feature

## Overview
The QR Code Generation feature allows business owners to create customizable QR codes for customer check-ins. Customers can scan these QR codes with their mobile devices to quickly navigate to the check-in page for that specific business.

## Features

### 🎨 Customization Options
- **Size Control**: Adjustable QR code size from 200px to 800px
- **Color Schemes**: 
  - Preset color combinations (Classic, Blue, Green, Purple, Red, Dark Mode)
  - Custom foreground and background colors with color picker
  - Hex color code input for precise control
- **Error Correction**: Four levels (Low 7%, Medium 15%, Quartile 25%, High 30%)

### ✨ Enhancements
- **Business Info Integration**: Optional business name and type display above QR code
- **Logo Embedding**: Add business logo to the center of QR code (when logo is available)
- **Canvas Rendering**: Enhanced QR codes are rendered on HTML5 canvas for better quality

### 📥 Export Options
- **Download**: Save QR code as PNG file with descriptive filename
- **Copy URL**: Copy the check-in URL to clipboard for sharing
- **Print**: Direct printing support for physical display

## How to Use

### For Business Owners

1. **Navigate to Business Dashboard**
   - Go to `/business/dashboard`
   - Find your business card

2. **Generate QR Code**
   - Click "Generate QR Code" button (orange button)
   - You'll be redirected to `/business/{businessId}/qr-code`

3. **Customize Your QR Code**
   - Adjust size using the slider (200-800px)
   - Choose error correction level based on your needs:
     - **Low (7%)**: Smallest QR code, best for clean environments
     - **Medium (15%)**: Recommended for most use cases
     - **Quartile (25%)**: Good for environments with some wear/tear
     - **High (30%)**: Best for harsh environments or small print sizes
   - Select color scheme from presets or use custom colors
   - Toggle business info display on/off
   - Toggle logo embedding (if logo is available)

4. **Download and Deploy**
   - Click "Download" to save the QR code as PNG
   - Click "Copy URL" to get the shareable check-in link
   - Click "Print" for immediate printing
   - Place QR codes in customer-visible locations

### For Customers

1. **Scan QR Code**
   - Use any QR code scanner app or camera app
   - Scan the business QR code

2. **Check In**
   - You'll be redirected to `/checkins?business={businessId}`
   - The check-in page will automatically detect the business
   - Follow the check-in process to earn rewards

## Technical Implementation

### URL Structure
- Generated QR codes contain: `${window.location.origin}/checkins?business=${businessId}`
- This directs users to the check-in page with the business pre-selected

### File Naming
- Downloaded files use format: `{business-name}-qr-code.png`
- Special characters in business names are handled appropriately

### Canvas Enhancement
When business info or logo is enabled:
- QR code is drawn on HTML5 canvas
- Business name and type are rendered above the QR code
- Logo is embedded in the center with white background circle
- Canvas size adjusts automatically to accommodate enhancements

### Performance
- QR codes are generated client-side using the `qrcode` library
- No server requests needed for QR code generation
- Instant preview updates when customization options change

## Best Practices

### QR Code Placement
- Place at customer eye level (3-4 feet high)
- Ensure good lighting for easy scanning
- Avoid reflective surfaces or areas with glare
- Keep the QR code clean and unobstructed

### Size Guidelines
- **Small (200-300px)**: Table tents, business cards
- **Medium (400-500px)**: Wall displays, posters
- **Large (600-800px)**: Window displays, large signage

### Color Selection
- **High Contrast**: Dark foreground on light background works best
- **Avoid**: Low contrast combinations, similar colors
- **Test**: Always test scanning before final deployment

### Error Correction
- **Low**: Perfect printing conditions, digital displays
- **Medium**: Standard paper printing, most common use
- **Quartile**: Outdoor use, potential wear and tear
- **High**: Small sizes, harsh environments, critical applications

## Troubleshooting

### QR Code Won't Scan
1. Check contrast between foreground and background colors
2. Ensure QR code size is appropriate for viewing distance
3. Verify the QR code isn't damaged or obscured
4. Try increasing error correction level

### Download Issues
1. Ensure modern browser with download support
2. Check if pop-up blocker is preventing download
3. Try right-click "Save As" if direct download fails

### Print Quality
1. Use high-resolution settings (300+ DPI)
2. Choose appropriate paper type (matte works better than glossy)
3. Ensure printer has adequate ink/toner levels
4. Test scan the printed version before mass distribution

## Future Enhancements

- **Analytics**: Track QR code scan rates and conversion
- **Batch Generation**: Create multiple QR codes simultaneously
- **Templates**: Pre-designed QR code layouts and styles
- **A/B Testing**: Generate different versions for testing
- **Dynamic QR Codes**: Update destination without regenerating