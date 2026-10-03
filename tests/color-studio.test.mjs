import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,roles,validatePalette,themeCss} from '../public/design-preview/color-studio/palette.js';
test('legacy saved schemes migrate without losing their existing choices',()=>{
 const old={nav:'#B49BCF',navActive:'#FFF',page:'#FBF7EF',model:'#FBF7EF',entry:'#F5D9C7',entryButton:'#FFF5E9',tissue:'#ECEEE1',consultation:'#EAE4F5',patient:'#D4EEE1',assessment:'#E8EDF8',treatment:'#F7E6BE',ink:'#233E50'};
 const c=validatePalette(old);assert.equal(c.nav,'#B49BCF');assert.equal(c.atlasEntry,c.nav);assert.equal(c.modeActive,c.patient);assert.equal(c.sheetHeader,c.assessment);assert.equal(Object.keys(c).length,roles.length);
 assert.throws(()=>validatePalette({...c,modeActive:'invalid'}));assert.throws(()=>validatePalette({...old,nav:undefined}));
});
test('new control colours export independently to actual component selectors',()=>{
 const c={...defaults,atlasEntry:'#CDEDDE',mode:'#EAF8F8',modeActive:'#EDC98C',sheetHeader:'#DDA2B4'};
 const css=themeCss(c);assert.match(css,/\.muscle-explorer-tab[^}]*#CDEDDE/);assert.match(css,/\.anatomy-mode button \{[^}]*#EAF8F8/);assert.match(css,/\.anatomy-mode button\.active \{[^}]*#EDC98C/);assert.match(css,/\.reasoning-sheet__header \{[^}]*#DDA2B4/);
 assert.match(css,/--header-blue: #90AFDE/);
});
