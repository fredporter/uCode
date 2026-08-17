# Terminal & Teletext Grid Modes — Work Tag

> **SUPERSEDED (2026-08-17)** — this tag predates the current Vue +
> `<gridui-canvas>` implementation. See `docs/GRIDUI_RENDERING_CONTRACT.md` and
> `docs/TELETEXT_ARCHITECTURE.md` for the live specs. Kept for historical
> reference only.

**Status:** 🔖 Tagged for Specialized Work  
**Priority:** High  
**Category:** Grid Rendering & Character Maps  
**Date:** 2026-06-27

## Overview

Terminal and Teletext grid modes require specialized CSS and rendering logic that differs from standard USX surfaces. These modes handle character-based displays, grid algebra, and retro-futuristic aesthetics.

## Tagged Components

### 1. Terminal Viewport

**Files:**

- `frontend/src/styles/gridui-terminal.css`
- `frontend/src/surfaces/ucode/UCodeSurface.tsx`

**Requirements:**

- Character-based rendering with monospace fonts
- Grid algebra for character positioning
- Terminal-specific animations (cursor blink, line scroll)
- Input field styling with retro aesthetics
- Integration with USX spacing variables

### 2. Teletext Mode

**Files:**

- `frontend/src/styles/gridui-terminal.css` (lines 69-200)
- `frontend/src/styles/gridui.css`

**Requirements:**

- Teletext page rendering (40x25 character grid)
- Info bar with page navigation
- LIVE/FEED/BBCSDL badges
- Flash animations for teletext effects
- Page navigation overlay

### 3. Grid Tools UI

**Files:**

- `frontend/src/surfaces/ucode/gridToolset.ts`
- `frontend/src/surfaces/ucode/UCodeSurface.tsx`

**Requirements:**

- Grid tool panels and controls
- Character map selectors
- Grid algebra calculators
- Viewport settings popup
- Display mode toggles

## Work Items

### Phase 1: Terminal Enhancement

- [ ] Enhance terminal viewport with USX spacing
- [ ] Add proper Pico CSS color variables
- [ ] Improve terminal input field styling
- [ ] Add cursor animations with USX timing
- [ ] Implement line scrolling with smooth transitions

### Phase 2: Teletext Enhancement

- [ ] Standardize teletext info bar with USX components
- [ ] Enhance badge animations with USX timing
- [ ] Improve page navigation overlay
- [ ] Add teletext-specific font loading
- [ ] Implement character grid rendering

### Phase 3: Grid Tools Enhancement

- [ ] Update grid tool panels with USX layout
- [ ] Enhance character map selectors
- [ ] Improve grid algebra calculator UI
- [ ] Add viewport settings popup with USX styling
- [ ] Implement display mode toggles

## Technical Constraints

⚠️ **IMPORTANT:** Grid-based CSS styles are intentionally SEPARATE from USX styles. Do NOT merge gridui styles with USX styles — they have unique rendering requirements (grid algebra, teletext, character maps) that conflict with USX layout.

### Separation Rules:

1. Keep `gridui.css` and `gridui-terminal.css` separate from USX files
2. Use USX variables for spacing and colors, but maintain grid-specific layout
3. Grid algebra calculations must remain independent
4. Character map rendering requires specialized positioning

## USX Integration Points

While maintaining separation, integrate these USX standards:

### Spacing Variables

```css
--usx-spacing-xs: 4px --usx-spacing-sm: 8px --usx-spacing-md: 12px
  --usx-spacing-lg: 16px --usx-spacing-xl: 24px;
```

### Color Variables

```css
--pico-background-color: #0d1117 --pico-card-background-color: #161b22
  --pico-color: #c9d1d9 --pico-muted-color: #8b949e --pico-border-color: #30363d
  --pico-primary: #58a6ff;
```

### Typography

```css
--pico-font-family: system-ui, -apple-system, sans-serif --pico-font-size: 1rem;
```

## Testing Requirements

1. **Terminal Mode Tests:**
   - Character rendering accuracy
   - Input field responsiveness
   - Cursor animation smoothness
   - Line scrolling performance

2. **Teletext Mode Tests:**
   - Page rendering accuracy (40x25 grid)
   - Badge animation performance
   - Navigation overlay functionality
   - Flash animation timing

3. **Grid Tools Tests:**
   - Panel layout responsiveness
   - Character map selector functionality
   - Grid algebra calculator accuracy
   - Settings popup usability

## Dependencies

- USX spacing system
- Pico CSS variables
- Custom monospace fonts (PetMe128, Teletext50, Press Start 2P, C64 User Mono)
- Grid algebra library
- Character map data

## Success Criteria

- [ ] Terminal viewport renders correctly with USX spacing
- [ ] Teletext mode displays 40x25 character grid accurately
- [ ] Grid tools UI is responsive and accessible
- [ ] All animations use USX timing standards
- [ ] Color variables use Pico CSS standards
- [ ] No conflicts with USX layout system

## Next Steps

1. Review current `gridui-terminal.css` implementation
2. Identify USX integration opportunities
3. Create enhancement plan for each component
4. Implement changes maintaining separation
5. Test all grid modes thoroughly
6. Document final implementation

## References

- `frontend/src/styles/gridui-terminal.css`
- `frontend/src/styles/gridui.css`
- `frontend/src/styles/usx/usx-spacing-scale.css`
- `frontend/src/styles/usx/usx-pico-reset.css`
- `docs/USX_LAYOUT_SYSTEM_SPEC.md`
