# Acharya Anuj Website

## Local Setup

1. Open this folder in VS Code.
2. Open the Terminal in VS Code.
3. Run the task:
   - `Terminal` > `Run Task...` > `Serve Website`

   or run directly:
   ```bash
   npx serve . -l 8000
   ```

4. Open your browser to:
   `http://localhost:8000`

## Customizing Your Astrologer Photo

### Option 1: Use a Local Image
1. Create an `images` folder in your project root
2. Save your astrologer photo as `acharya-anuj.jpg` (e.g., the photo you provided)
3. Open `index.html` and find this section:
   ```javascript
   window.acharyaConfig = {
     phone: "+918218433649",
     whatsapp: "918218433649",
     acharyaImage: "https://images.unsplash.com/...",
   };
   ```
4. Replace the `acharyaImage` URL with:
   ```
   acharyaImage: "images/acharya-anuj.jpg"
   ```

### Option 2: Use an Online Image URL
- Simply update the `acharyaImage` URL in the config to your hosted image URL

## File Structure

- `index.html` - Main HTML with all sections
- `styles.css` - Responsive design with astrological theme and kundali patterns
- `script.js` - Dynamic services, scroll effects, and contact behavior
- `.vscode/tasks.json` - VS Code task configuration

## Editable Settings

All important values can be edited in `index.html` under `window.acharyaConfig`:
- **Phone**: Your contact number
- **WhatsApp**: Your WhatsApp number (without +)
- **Astrologer Image**: URL to your professional photo

## Features

✨ Modern responsive design
✨ Dark cosmic/spiritual theme with gold, saffron, maroon
✨ Kundali & zodiac decorative patterns throughout
✨ Sticky navigation with active highlighting
✨ Dynamic service cards
✨ Smooth scroll animations
✨ Contact form integration
✨ Floating WhatsApp button
✨ Back-to-top button
✨ Mobile-friendly layout
