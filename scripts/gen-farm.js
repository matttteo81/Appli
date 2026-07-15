// Génère les sprites d'animaux de la ferme en PNG net (pixel-art),
// une variante par couleur de pelage. node scripts/gen-farm.js
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT = path.join(__dirname, '..', 'assets', 'farm');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PAL = { o:'#26203a', w:'#F3ECE1', g:'#d8cdb4', y:'#F2A65A', l:'#F8CE93', k:'#EF8C7C', r:'#c65b6b',
  C:'#C98B45', D:'#9c6a30' };

const S = {
  egg:["....oooo....","...owwwwo...","..owwwwwwo..","..owwwwwwo..",".owwwwwwwwo.",".owwwwwwwwo.",".owwwwwwggo.",".owwwwwgggo.",".owwwwwwwgo.","..owwwwwwo..","..owwwwwwo..","...owwwwo...","....oooo...."],
  chick:["..............",".....oooo.....","....oyyyyo....","...oyyyyyyo...","...oyowyyyo...","...oyyyyykk...","..oyyyyyyyyo..","..oyyllllyyo..","..oyllllllyo..","..oyyllllyyo..","...oyyyyyyo...","....oooooo....","....k....k....",".............."],
  hen:["................",".......rr.......","......rrrr......",".....oCCCCo.....","....oCCCCCCo....","....oCwoCCCo....","....oCCCCCyyo...","...oCCCCCCCCo...","..oCCCCDDCCCCo..","..oCCCDDDDCCCo..","..oCCDDDDDDCCo..","...oCCCCCCCCo...","....oooooooo....",".....y....y.....",".....y....y.....","................"],
  cat:["................","...o......o.....","..oCo....oCo....","..oCCo..oCCo....","..oCCCooCCCo....",".oCCCCCCCCCCo...",".oCwoCCCCowCo...",".oCCCCCCCCCCo...",".oCCCwrrwCCCo...",".oCCCwCCwCCCo...",".oCCCCCCCCCCo...","..oCCCCCCCCo....","..oCCCCCCCCoCo..","..oCCCCCCCCoCo..","..oCC..CCo.oo...","...oo..oo......."],
  dog:["................",".oo........oo...","oCCo......oCCo..","oCCCo....oCCCo..","oCCCCoooooCCCo..","oDCCCCCCCCCCDo..","oDCwoCCCCowCDo..","oDCCCCCCCCCCDo..","oDCCCCrrCCCCDo..",".oCCCwrrwCCCo...",".oCCCwwwwCCCo...",".oCCCCCCCCCCo...","..oCCCCCCCCo....","..oCC.oo.CCo....","..ooo....ooo....","................"],
  rabbit:["..............","..oo....oo....",".oCo....oCo...",".oCo....oCo...",".oCo....oCo...","..oCCCCCCo....","..oCwCCwCo....","..oCCCrrCCo...","..oCCCCCCo....",".oCCCCCCCCo...",".oCCCCCCCCo...",".oCCCCCCCCo...","..oCCCCCCo....","..oo....oo...."],
  pig:["................","..oo......oo....",".oCCo....oCCo...",".oCCCCCCCCCCo...","oCCoCCCCCCoCCo..","oCCCCCrrCCCCCo..","oCCCCrCCrCCCCo..","oCCCCCrrCCCCCo..","oCCCCCCCCCCCCo..",".oCCCCCCCCCCo...","..o.o....o.o....","................"],
};
const COATS = {
  dog:[['#C98B45','#9c6a30'],['#8a5f34','#5f3f22'],['#9a93b8','#6f688f'],['#3a3350','#26203a'],['#E0C089','#b89658'],['#efd9c2','#c9b299']],
  cat:[['#8079a6','#5b5488'],['#F2A65A','#c97f3a'],['#F3ECE1','#cfc6b6'],['#3a3350','#26203a'],['#b98a52','#8a5f34']],
  rabbit:[['#F3ECE1','#cfc6b6'],['#9a93b8','#6f688f'],['#b98a52','#8a5f34'],['#E0C089','#b89658'],['#3a3350','#26203a']],
  pig:[['#EF8C7C','#c96f63'],['#f2a7a0','#d1837c'],['#e79a86','#c5786a'],['#f0b7a0','#cf9074']],
  hen:[['#F3ECE1','#d8cdb4'],['#C98B45','#9c6a30'],['#3a3350','#26203a'],['#E0C089','#b89658'],['#9a93b8','#6f688f']],
};
const SC = 6;

function toSvg(rows){
  const w = Math.max(...rows.map(r=>r.length)), h = rows.length;
  let rects = '';
  for(let j=0;j<h;j++){ const row=rows[j];
    for(let i=0;i<row.length;i++){ const c=PAL[row[i]]; if(!c) continue;
      rects += `<rect x="${i*SC}" y="${j*SC}" width="${SC}" height="${SC}" fill="${c}"/>`; } }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w*SC}" height="${h*SC}" shape-rendering="crispEdges">${rects}</svg>`;
}
function render(rows, name){
  const png = new Resvg(toSvg(rows), { background:'rgba(0,0,0,0)' }).render().asPng();
  fs.writeFileSync(path.join(OUT, name+'.png'), png);
}

// Fixes
render(S.egg, 'egg');
render(S.chick, 'chick');
// Une variante par couleur
for(const [sp, rows] of Object.entries(S)){
  if(!COATS[sp]) continue;
  COATS[sp].forEach((coat, i) => { PAL.C=coat[0]; PAL.D=coat[1]; render(rows, `${sp}_${i}`); });
}
console.log('OK — sprites générés dans', OUT);
console.log('Counts:', Object.fromEntries(Object.entries(COATS).map(([k,v])=>[k,v.length])));
