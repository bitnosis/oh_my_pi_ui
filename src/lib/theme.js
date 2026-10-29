export const defaultColor = '#be3c4f';
export const builtInThemes = ['light','dark','cupcake','bumblebee','emerald','corporate','synthwave','retro','cyberpunk','valentine','halloween','garden','forest','aqua','lofi','pastel','fantasy','wireframe','black','luxury','dracula','cmyk','autumn','business','acid','lemonade','night','coffee','winter','dim','nord','sunset','caramellatte','abyss','silk'];

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
}

export function applyBuiltInTheme(name) {
  if(!builtInThemes.includes(name))return false;
  const root=document.documentElement;
  for(const key of Object.keys(themeVariables(defaultColor)))root.style.removeProperty(key);
  root.style.removeProperty('color-scheme');
  root.dataset.theme=name;
  return true;
}
