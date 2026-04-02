# Admin Portal UI/Design Rules

This document contains all UI and design rules that must be followed when developing the admin portal.

## Last Updated
2026-01-XX

---

## Button Alignment Rules

### Rule 1: All Buttons Must Be Properly Aligned
- All buttons across the admin portal must be properly aligned
- Primary action buttons (Add, Create, Update, etc.) should use:
  - `px-6` for consistent width
  - `whitespace-nowrap` on text spans to prevent wrapping
  - `items-center` for proper vertical alignment
  - `gap-2` or `gap-3` for spacing between icon and text
- Table action buttons should use:
  - `btn-sm` size (not `btn-xs`)
  - `px-3` for consistent width
  - `whitespace-nowrap` on text spans
  - `items-center` for proper alignment
  - Remove `flex-wrap` to prevent overlapping
- Modal action buttons should use:
  - `px-6` for wider buttons
  - `gap-3` for spacing
  - `mt-8` for top margin
  - `whitespace-nowrap` on button text
  - `items-center` for alignment

---

## Form Input Rules

### Rule 2: All Input Fields Must Have Visible Borders
- All inputs, selects, textareas, and file inputs must have visible borders
- Use `border-base-300` class for default border color
- Use `focus:border-primary` for focus state (purple #432AD5)
- Use `focus:outline-none` to remove default outline
- Labels should have `pb-2` spacing to prevent overlap with inputs
- Form spacing should use `space-y-6` for better visual separation

---

## Color Theme Rules

### Rule 3: Primary Color
- Primary color: **#432AD5** (Purple)
- All primary buttons, links, and accents must use this color
- Hover state: **#3622b0**
- Active state: **#2a1a8b**

---

## Delete Button Rules

### Rule 4: Delete Buttons Must Be Red
- All delete buttons must use `btn-error` class (red color)
- Delete buttons should be clearly visible and properly aligned
- Use same sizing and alignment rules as other action buttons

---

## General UI Rules

### Rule 5: Consistent Spacing
- Use consistent padding: `p-4 sm:p-5` or `p-5 sm:p-6` for card bodies
- Use `gap-4` or `gap-6` for grid spacing
- Modal content should have proper spacing: `space-y-6` for forms

### Rule 6: Responsive Design
- All buttons should have responsive text (hidden on mobile, shown on desktop)
- Use `hidden sm:inline` for button text on small screens
- Use `sm:hidden` for mobile-only text
- Maintain proper alignment across all screen sizes

---

## Notes
- These rules should be followed for all new features and updates
- When in doubt, refer to existing implementations in Modules and Students pages as reference
- All UI changes must maintain consistency with these rules
