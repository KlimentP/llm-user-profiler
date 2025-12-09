# 🎨 LLM User Profiler - Beautiful CLI Edition

A stunning, interactive CLI application built with **Ink.js** for profiling users based on their database activities.

## ✨ Features

- 🌈 **Beautiful UI** with gradients, colors, and animations
- 🎯 **Interactive Menus** for easy navigation
- ⚡ **Phase-based Workflow** with visual progress indicators
- 🔄 **Resume Capability** - pick up where you left off
- 📊 **Real-time Feedback** with spinners and status updates

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Run the beautiful CLI
bun start

# Or use the old CLI (plain text)
bun run old
```

## 🎭 Usage

```bash
# With options
bun start --api-key YOUR_KEY --model gemini-2.5-flash --pg-connection "postgresql://..."

# With environment variables
export OPENROUTER_API_KEY=your_key
export PG_CONNECTION_STRING="postgresql://..."
bun start
```

## 📋 Workflow Phases

### 1. 🏠 Welcome Screen
- Choose to start fresh, use existing plan, or resume from profiling
- Beautiful configuration display
- Smart detection of existing work

### 2. 📝 Planning Phase  
- Database schema introspection
- LLM-powered analysis plan generation
- Interactive review and approval

### 3. ⚙️ Execution Phase
- SQL query execution
- Progress indicators
- Interim results saved automatically

### 4. 🧠 Profiling Phase
- LLM-based user profile generation
- Qualitative insights extraction
- Structured JSON output

### 5. 🎉 Completion
- Success celebration
- File summary
- Auto-exit with countdown

## 🎨 UI Components

The CLI uses several beautiful components:

- **Gradient Text** - Rainbow and themed gradients
- **Big Text** - ASCII art titles
- **Info Boxes** - Bordered, colored information displays
- **Spinners** - Animated loading indicators
- **Select Inputs** - Interactive menu selections
- **Progress Indicators** - Phase-by-phase visual feedback

## 📦 Tech Stack

- **Bun** - Fast JavaScript runtime
- **TypeScript** - Type-safe code
- **Ink** - React for CLIs
- **ink-gradient** - Beautiful gradient text
- **ink-big-text** - ASCII art titles
- **ink-spinner** - Loading animations
- **ink-select-input** - Interactive menus
- **PostgreSQL** - Database connection
- **OpenRouter** - LLM API access

## 🎯 Output Files

All files are saved to `./llm-user-profiler/`:

- `analysis_plan.md` - Generated analysis strategy
- `interim_results.json` - SQL query results
- `user_profiles.json` - Final user profiles

## 🛠️ Development

```bash
# Run in development mode
bun dev

# Type checking
bun tsc --noEmit
```

## 🌟 Why Ink.js?

Ink brings the power of React to the terminal:
- ✅ Component-based architecture
- ✅ State management with hooks
- ✅ Beautiful, responsive UIs
- ✅ Easy to test and maintain
- ✅ Rich ecosystem of components

## 📸 Screenshots

The CLI features:
- 🌈 Rainbow gradient titles
- 💫 Smooth animations
- 🎨 Color-coded phases
- 📦 Bordered information boxes
- ⚡ Real-time progress updates

## 🤝 Contributing

Feel free to enhance the UI with more Ink components or improve the user experience!

## 📄 License

MIT

---

**Made with ❤️ using Ink.js** - Because CLIs deserve to be beautiful too!
