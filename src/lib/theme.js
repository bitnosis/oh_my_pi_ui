export const defaultColor = '#9e27a0';
export const defaultBackgroundOpacity = 0.2;
export const builtInThemes = ['light','dark','cupcake','bumblebee','emerald','corporate','synthwave','retro','cyberpunk','valentine','halloween','garden','forest','aqua','lofi','pastel','fantasy','wireframe','black','luxury','dracula','cmyk','autumn','business','acid','lemonade','night','coffee','winter','dim','nord','sunset','caramellatte','abyss','silk'];

/** Pick 'pi' or 'leaf'. Themes with their own picture still use that picture. */
export const defaultChatBackgroundId = 'pi';
export const chatBackgroundChoices = {
  leaf: {
    image: '/backgrounds/logo-leaf.svg',
    opacity: 0.15,
    position: '67% center',
    size: 'auto 52%',
    tint: 'var(--color-primary)',
  },
  pi: {
    image: '/backgrounds/logo-pi.svg',
    opacity: 0.25,
    position: '80% 50%',
    size: 'auto 52%',
    gradient: 'linear-gradient(140deg,var(--logo-start,var(--color-secondary)),var(--logo-mid,var(--color-primary)) 54%,var(--logo-end,var(--color-accent)))',
  },
};
export const defaultChatBackground = chatBackgroundChoices[defaultChatBackgroundId];

/** Main-area art keyed by built-in theme. Themes left out of this map use the chosen default. */
export const themeBackgrounds = {
  halloween: { image: '/backgrounds/halloween.png', opacity: 0.15 },
  forest: { image: '/backgrounds/forest.png', opacity: 0.23 },
  synthwave: { image: '/backgrounds/synthwave.png', opacity: 0.1 },
  night: { image: '/backgrounds/night.png', opacity: 0.1 },
  emerald: { image: '/backgrounds/emerald-crystals-light.png', opacity: 0.20 },
  bumblebee: { image: '/backgrounds/bumblebee.png', opacity: 0.10 },
  coffee: { image: '/backgrounds/coffee.png', opacity: 0.1, position: '67% center' },
  abyss: { image: '/backgrounds/abyss.png', opacity: 0.1 },
};

export function themeBackground(name) {
  const entry = themeBackgrounds[name] || defaultChatBackground;
  if (!entry?.image) return null;
  const opacity = Number(entry.opacity);
  return {
    image: entry.image,
    opacity: Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : defaultBackgroundOpacity,
    ...(entry.position ? { position: entry.position } : {}),
    ...(entry.size ? { size: entry.size } : {}),
    ...(entry.tint ? { tint: entry.tint } : {}),
    ...(entry.gradient ? { gradient: entry.gradient } : {}),
  };
}

let showThemeBackgrounds = true;

export function setShowThemeBackgrounds(enabled) {
  showThemeBackgrounds = enabled !== false;
}

function applyThemeBackground(name) {
  const root = document.documentElement;
  const background = showThemeBackgrounds ? themeBackground(name) : null;
  const tinted = Boolean(background?.tint);
  root.style.setProperty('--theme-pi-display',background?.gradient?'block':'none');
  root.style.setProperty('--theme-bg-image', background && !tinted && !background.gradient ? `url("${background.image}")` : 'none');
  root.style.setProperty('--theme-bg-mask', tinted ? `url("${background.image}")` : 'none');
  root.style.setProperty('--theme-bg-tint', background?.tint || 'transparent');
  root.style.setProperty('--theme-bg-filter', background?.tint ? 'drop-shadow(0 0 18px var(--color-primary)) drop-shadow(0 0 36px var(--color-primary))' : 'none');
  root.style.setProperty('--theme-bg-opacity', background ? String(background.opacity) : '0');
  root.style.setProperty('--theme-bg-position', background?.position || 'center right');
  root.style.setProperty('--theme-bg-size', background?.size || 'cover');
}

export function themeVariables(hex, mode='dark') {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const [r, g, b] = hex.slice(1).match(/../g).map(c => parseInt(c, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min, lightness = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  let hue = 0;
  if (delta) {
    hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const tone = (light, strength) => `hsl(${hue} ${Math.min(85, saturation * strength * 100)}% ${light}%)`;
  const variables = {
    '--color-base-100': tone(9, .28),
    '--color-base-200': tone(12, .36),
    '--color-base-300': tone(17, .38),
    '--color-base-content': tone(93, .25),
    '--color-primary': tone(76, 1),
    '--color-primary-content': tone(12, .5),
    '--color-secondary': tone(62, .85),
    '--color-secondary-content': tone(10, .4),
    '--color-accent': tone(70, .9),
    '--color-accent-content': tone(10, .4),
    '--color-neutral': tone(23, .35),
    '--color-neutral-content': tone(89, .3),
    '--color-info': tone(77, .8),
    '--color-info-content': tone(12, .4),
    '--color-success': tone(74, .8),
    '--color-success-content': tone(12, .4),
    '--color-warning': tone(80, .8),
    '--color-warning-content': tone(12, .4),
    '--color-error': tone(81, .8),
    '--color-error-content': tone(12, .4),
    '--theme-border': tone(26, .35),
    '--theme-muted': tone(67, .3),
    '--theme-code': tone(7, .3),
    '--theme-color': hex,
    '--logo-start': `hsl(${(hue+28)%360} ${Math.min(90,saturation*110)}% 62%)`,
    '--logo-mid': `hsl(${hue} ${Math.min(90,saturation*110)}% 60%)`,
    '--logo-end': `hsl(${(hue+332)%360} ${Math.min(85,saturation*95)}% 72%)`,
  };
  if(mode==='light')Object.assign(variables,{
    '--color-base-100':tone(98,.2),'--color-base-200':tone(94,.23),'--color-base-300':tone(89,.28),'--color-base-content':tone(14,.35),
    '--color-primary':tone(33,.9),'--color-primary-content':tone(98,.15),'--color-secondary':tone(40,.65),'--color-secondary-content':tone(98,.15),
    '--color-accent':tone(35,.8),'--color-accent-content':tone(98,.15),'--color-neutral':tone(82,.3),'--color-neutral-content':tone(14,.35),
    '--theme-border':tone(78,.25),'--theme-muted':tone(39,.25),'--theme-code':tone(92,.18),
  });
  return variables;
}

export function applyTheme(hex,mode='dark') {
  const variables = themeVariables(hex,mode);
  if (!variables) return;
  document.documentElement.dataset.theme='omp';
  for (const [key, value] of Object.entries(variables)) document.documentElement.style.setProperty(key, value);
  document.documentElement.style.colorScheme=mode;
  applyThemeBackground('custom');
}

export function applyBuiltInTheme(name) {
  if(!builtInThemes.includes(name))return false;
  const root=document.documentElement;
  for(const key of Object.keys(themeVariables(defaultColor)))root.style.removeProperty(key);
  root.style.removeProperty('color-scheme');
  root.dataset.theme=name;
  applyThemeBackground(name);
  return true;
}
