# Font Awesome Icons

This project uses [Font Awesome](https://fontawesome.com/) for all icons throughout the application.

## Installation

Font Awesome is already installed with the following packages:

```json
"@fortawesome/fontawesome-svg-core": "^6.x.x",
"@fortawesome/free-solid-svg-icons": "^6.x.x",
"@fortawesome/free-brands-svg-icons": "^6.x.x",
"@fortawesome/react-fontawesome": "^0.x.x"
```

## Usage

### Basic Icon Usage

Import the `FontAwesomeIcon` component and the icons you need:

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faHome } from '@fortawesome/free-solid-svg-icons';

function MyComponent() {
  return (
    <div>
      <FontAwesomeIcon icon={faUser} />
      <FontAwesomeIcon icon={faHome} />
    </div>
  );
}
```

### Icon Packs

- **Solid Icons**: `@fortawesome/free-solid-svg-icons` - General purpose icons
- **Brand Icons**: `@fortawesome/free-brands-svg-icons` - Social media and company logos

### Icons Used in This Project

#### Navigation (HomePage.tsx)
```tsx
import { 
  faBook,           // Library icon
  faShoppingCart,   // Shop icon
  faBuilding,       // Organization icon
  faUser,           // Account icon
  faRightFromBracket, // Logout icon
  faPlay,           // Video play button
  faCircle          // Default organization logo
} from '@fortawesome/free-solid-svg-icons';
```

#### Authentication (Login.tsx)
```tsx
import { faApple, faGoogle } from '@fortawesome/free-brands-svg-icons';
```

### Styling Icons

Icons inherit the current font size and color. You can style them with CSS:

```css
.nav-icon {
  font-size: 18px;
  width: 20px;
  text-align: center;
}

.social-icon {
  width: 20px;
  height: 20px;
}
```

Or with inline styles/className:

```tsx
<FontAwesomeIcon icon={faUser} className="my-icon-class" />
<FontAwesomeIcon icon={faUser} style={{ fontSize: '24px', color: 'blue' }} />
```

### Advanced Features

#### Icon Sizing
```tsx
<FontAwesomeIcon icon={faUser} size="xs" />
<FontAwesomeIcon icon={faUser} size="lg" />
<FontAwesomeIcon icon={faUser} size="2x" />
<FontAwesomeIcon icon={faUser} size="3x" />
```

#### Fixed Width
Useful for aligning icons in lists:
```tsx
<FontAwesomeIcon icon={faUser} fixedWidth />
```

#### Rotation & Flipping
```tsx
<FontAwesomeIcon icon={faUser} rotation={90} />
<FontAwesomeIcon icon={faUser} flip="horizontal" />
<FontAwesomeIcon icon={faUser} flip="vertical" />
```

#### Spinning/Pulsing
```tsx
<FontAwesomeIcon icon={faSpinner} spin />
<FontAwesomeIcon icon={faCircle} pulse />
```

## Finding Icons

Browse available icons at:
- Free Solid Icons: https://fontawesome.com/search?o=r&m=free&s=solid
- Free Brand Icons: https://fontawesome.com/search?o=r&m=free&f=brands

## Example Replacements

We've replaced emoji icons with Font Awesome:

| Old Emoji | New Icon | Import |
|-----------|----------|--------|
| 📚 | `<FontAwesomeIcon icon={faBook} />` | `faBook` |
| 🛒 | `<FontAwesomeIcon icon={faShoppingCart} />` | `faShoppingCart` |
| 🏢 | `<FontAwesomeIcon icon={faBuilding} />` | `faBuilding` |
| 👤 | `<FontAwesomeIcon icon={faUser} />` | `faUser` |
| 🚪 | `<FontAwesomeIcon icon={faRightFromBracket} />` | `faRightFromBracket` |
| ▶ | `<FontAwesomeIcon icon={faPlay} />` | `faPlay` |
| 🎾 | `<FontAwesomeIcon icon={faCircle} />` | `faCircle` |

## Resources

- [Font Awesome React Documentation](https://fontawesome.com/docs/web/use-with/react)
- [Icon Search](https://fontawesome.com/search)
- [React Component API](https://github.com/FortAwesome/react-fontawesome#features)
