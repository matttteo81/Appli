// Génère les sprites d'animaux de la ferme en PNG net (pixel-art).
// node scripts/gen-farm.js
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT = path.join(__dirname, '..', 'assets', 'farm');
fs.mkdirSync(OUT, { recursive: true });

const PAL = { o:'#26203a', w:'#F3ECE1', g:'#d8cdb4', y:'#F2A65A', l:'#F8CE93',
  k:'#EF8C7C', r:'#c65b6b', p:'#8079a6', b:'#c3bce0', n:'#b98a52', m:'#8a5f34' };

const S = {
  hen:["................",".......rr.......","......rrrr......",".....owwwwo.....","....owwwwwwo....","....owowwwwo....","....owwwwwyyo...","...owwwwwwwwo...","..owwwwggwwwwo..","..owwwggggwwwo..","..owwggggggwwo..","...owwwwwwwwo...","....oooooooo....",".....y....y.....",".....y....y.....","................"],
  chick:["..............",".....oooo.....","....oyyyyo....","...oyyyyyyo...","...oyowyyyo...","...oyyyyykk...","..oyyyyyyyyo..","..oyyllllyyo..","..oyllllllyo..","..oyyllllyyo..","...oyyyyyyo...","....oooooo....","....k....k....",".............."],
  egg:["....oooo....","...owwwwo...","..owwwwwwo..","..owwwwwwo..",".owwwwwwwwo.",".owwwwwwwwo.",".owwwwwwggo.",".owwwwwgggo.",".owwwwwwwgo.","..owwwwwwo..","..owwwwwwo..","...owwwwo...","....oooo...."],
  cat:["................","..po......op....",".pppo....opppp..",".prpo....oprp...","..oppppppppo....","..opowppwopo....","..oppppppppo....","..oppwwwwppo....","..oppppppppo....",".opppppppppo....",".opppbbpppppo...","..opppppppppo...","...ooooooooo....","................"],
  rabbit:["..............","..wo....ow....",".wro....orw...",".wro....orw...",".wwo....oww...","..owwwwwwo....","..owowwowo....","..owwrrwwo....","..owwwwwwo....",".owwwwwwwwo...",".owwwwwwwwo...",".owwwwwwwwo...","..owwwwwwo....","..oo....oo...."],
  pig:["................","..kk......kk....",".okko....okko...",".okkkkkkkkkko...","okkokkkkkkokko..","okkkkkrrkkkkko..","okkkkrrrrkkkko..","okkkkkrrkkkkko..","okkkkkkkkkkkko..",".okkkkkkkkkko...","..o.o....o.o....","................"],
  dog:["..............",".........onno.","........onnnno",".......onnonno","..oonnnnnnnnno","..onnnnnnnnno.","..onmmmmmmno..","..on.on.onn...",".............."],
};

const SC = 6; // 1 pixel du sprite = 6 px réels
function toSvg(rows){
  const w = Math.max(...rows.map(r=>r.length)), h = rows.length;
  let rects = '';
  for(let j=0;j<h;j++){ const row=rows[j];
    for(let i=0;i<row.length;i++){ const c=PAL[row[i]]; if(!c) continue;
      rects += `<rect x="${i*SC}" y="${j*SC}" width="${SC}" height="${SC}" fill="${c}"/>`; } }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w*SC}" height="${h*SC}" shape-rendering="crispEdges">${rects}</svg>`;
}

for(const [name, rows] of Object.entries(S)){
  const svg = toSvg(rows);
  const png = new Resvg(svg, { background:'rgba(0,0,0,0)' }).render().asPng();
  fs.writeFileSync(path.join(OUT, name+'.png'), png);
  console.log('✔', name);
}
console.log('Sprites générés dans', OUT);
