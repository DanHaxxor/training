# Training Material - Single Page App

A clean, modern single-page application for delivering training content with smooth navigation and a great learning experience. Built with a **modular architecture** that scales to hundreds of training modules.

## Features

- **Single Page App Architecture**: No page reloads - smooth transitions between content
- **Modular Content System**: Each module is a separate file for easy management
- **Lazy Loading**: Content loads on-demand with intelligent caching
- **Responsive Design**: Works great on desktop, tablet, and mobile devices
- **Keyboard Navigation**: Use arrow keys to navigate between pages
- **Progress Tracking**: See your current position in the training material
- **Clean, Professional UI**: Focused on readability and learning
- **Scales to Hundreds of Modules**: Organized structure supports large training programs

## Files Structure

```
peter-material/
├── index.html                  # Main HTML file
├── styles.css                  # All styling
├── app.js                     # JavaScript logic for SPA functionality
├── programs.json              # Master index of all programs
├── programs/                  # Training programs directory
│   ├── social-media-marketing/
│   │   ├── manifest.json
│   │   └── content/
│   │       ├── intro-smm.json
│   │       ├── audience.json
│   │       ├── content-strategy.json
│   │       ├── platforms.json
│   │       ├── creating-content.json
│   │       └── analytics.json
│   ├── content-creation/
│   │   ├── manifest.json
│   │   └── content/
│   │       └── content-intro.json
│   └── analytics-reporting/
│       ├── manifest.json
│       └── content/
│           └── analytics-intro.json
└── README.md                  # This file
```

## Getting Started

1. Open `index.html` in a web browser
2. Select a training program from the dropdown in the sidebar
3. Navigate through the training material using:
   - The sidebar navigation (click on any module)
   - Program selector dropdown (switch between programs)
   - Inline Previous/Next buttons at the bottom of each page
   - Arrow keys on your keyboard

## Architecture Benefits

### Multi-Program Structure

This app uses a **hierarchical multi-program architecture** that provides:

1. **Multiple Training Programs**: Organize different courses/topics separately
2. **Scalability**: Each program can have hundreds of modules
3. **Performance**: Only loads content when needed (lazy loading)
4. **Maintainability**: Edit individual modules without touching others
5. **Collaboration**: Teams can work on different programs simultaneously
6. **Caching**: Loaded content is cached to avoid redundant fetches
7. **Organization**: Programs, modules, and content are all well-organized

### How It Works

1. **programs.json** - Master index listing all available training programs
2. **programs/** directory - Each program has its own folder
3. **manifest.json** (per program) - Lists all modules in that program
4. **content/** folder (per program) - Individual JSON files for each module
5. App loads programs → selected program's manifest → content on-demand
6. Users can switch between programs using the dropdown selector

## Managing Content

### Adding a New Training Program

1. **Create program directory**: `programs/your-program-name/`
2. **Create manifest.json** in the program directory
3. **Create content/** subdirectory for module files
4. **Add entry to programs.json**:

```json
{
  "id": "your-program-name",
  "title": "Your Program Title",
  "description": "Brief description of the program",
  "manifest": "programs/your-program-name/manifest.json",
  "icon": "🎓",
  "difficulty": "Beginner",
  "duration": "X modules"
}
```

### Adding a New Module to a Program

1. **Create the content file** in `programs/your-program/content/`:

```bash
# Example: programs/your-program/content/new-module.json
```

2. **Add entry to that program's manifest.json**:

```json
{
  "id": "new-module",
  "title": "Your Module Title",
  "file": "content/new-module.json",
  "category": "Category Name",
  "description": "Brief description",
  "order": 7
}
```

3. **Create the content** following the structure below

### Module File Structure

Each module file in `content/` follows this structure:

```json
{
  "title": "Page Title",
  "sections": [
    {
      "type": "paragraph",
      "content": "Your text here with **bold** and *italic* support"
    }
  ]
}
```

### Programs Index Structure

The `programs.json` lists all available programs:

```json
{
  "title": "Training Library",
  "programs": [
    {
      "id": "unique-id",
      "title": "Program Title",
      "description": "What this program covers",
      "manifest": "programs/program-id/manifest.json",
      "icon": "📱",
      "difficulty": "Beginner|Intermediate|Advanced",
      "duration": "X modules"
    }
  ]
}
```

### Program Manifest Structure

Each program's `manifest.json` organizes its modules:

```json
{
  "title": "Program Title",
  "description": "Program description",
  "version": "1.0.0",
  "modules": [
    {
      "id": "unique-id",
      "title": "Module Title",
      "file": "content/filename.json",
      "category": "Category",
      "description": "What this module covers",
      "order": 1
    }
  ]
}
```

### Available Section Types

1. **Paragraph**
   ```json
   {
     "type": "paragraph",
     "content": "Text with **bold**, *italic*, `code`, and [links](url)"
   }
   ```

2. **Heading**
   ```json
   {
     "type": "heading",
     "content": "Main Section Heading"
   }
   ```

3. **Subheading**
   ```json
   {
     "type": "subheading",
     "content": "Subsection Heading"
   }
   ```

4. **List** (ordered or unordered)
   ```json
   {
     "type": "list",
     "ordered": false,
     "items": [
       "First item",
       "Second item with **formatting**"
     ]
   }
   ```

5. **Code Block**
   ```json
   {
     "type": "code",
     "content": "const example = 'code here';"
   }
   ```

6. **Quote**
   ```json
   {
     "type": "quote",
     "content": "An inspiring or important quote"
   }
   ```

7. **Image**
   ```json
   {
     "type": "image",
     "src": "path/to/image.jpg",
     "alt": "Image description"
   }
   ```

### Inline Formatting

In paragraph, list item, and quote content, you can use:
- `**bold text**` for bold
- `*italic text*` for italic
- `` `code` `` for inline code
- `[link text](url)` for links

## Customizing Appearance

### Colors

Edit the CSS variables in `styles.css` to change the color scheme:

```css
:root {
    --primary-color: #2563eb;        /* Main brand color */
    --sidebar-bg: #1e293b;           /* Sidebar background */
    --content-bg: #ffffff;           /* Content area background */
    /* ... more variables ... */
}
```

### Layout

The app is built with flexbox and is fully responsive. Key classes to modify:
- `.sidebar` - Navigation sidebar styling
- `.content` - Main content area
- `.nav-btn` - Navigation button styling

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Tips for Training Content

1. **Keep pages focused**: Each page should cover one main topic
2. **Use visual hierarchy**: Mix headings, paragraphs, and lists
3. **Make it scannable**: Use lists and formatting to help learners find key information
4. **Add interactivity**: Include questions in your content to encourage thinking
5. **Sequential flow**: Order pages logically from basics to advanced concepts

## Scaling to Hundreds of Programs and Modules

This architecture is designed to handle large-scale training libraries:

### Organizing Large Training Libraries

1. **Multiple Programs**: Separate distinct courses/topics into different programs
2. **Use Categories**: Group modules by topic within each program's manifest
3. **Subdirectories**: Further organize content files:
   ```
   programs/
   ├── marketing/
   │   ├── social-media/
   │   ├── email-marketing/
   │   └── content-marketing/
   ├── design/
   │   ├── ui-ux/
   │   └── graphic-design/
   └── development/
       ├── frontend/
       └── backend/
   ```
4. **Naming Convention**: Use descriptive, consistent file names
5. **Version Control**: Track changes to individual modules easily with git

### Real-World Example Structure

For a comprehensive training platform:
- 10-20 training programs
- 10-50 modules per program
- 100-1000 total training modules
- Organized by department, skill level, or topic

### Performance Considerations

- **Lazy Loading**: Only fetches content when user navigates to it
- **Caching**: Visited pages load instantly from memory
- **Small Manifest**: Loads quickly even with 100+ modules
- **No Bundle Bloat**: Content isn't compiled into JavaScript

### Future Enhancements

If needed, you can add:
- Search functionality across all modules
- Module prerequisites and dependencies
- Progress tracking and bookmarking
- Completion certificates
- Quiz/assessment integration
- User annotations and notes

## Deployment

This is a static site that can be hosted anywhere:
- GitHub Pages
- Netlify
- Vercel
- Any web server

Just upload all files (including the `content/` folder) and point to `index.html`.

## Support

For issues or questions, refer to the documentation or modify the code to fit your needs. The codebase is intentionally simple and well-commented for easy customization.
