const assert=require('assert'),{Game}=require('../web/engine.js'),AI=require('../web/strategy.js');
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
const c=(r,s=0)=>s*13+r-2;
function opening(stack=2000){let g=new Game([0,1,2],stack),s=AI.snapshot(g,g.players[g.turn]);s.hole=[c(14),c(14,1)];return s}
let deep=opening(),actions=AI.candidates(deep),raises=actions.filter(a=>a.type==='raise');assert(raises.length);assert(raises.every(a=>a.target<=60));assert(!raises.some(a=>a.target===deep.limits.max));
console.log('PASS: deep AA opens for 2.5–3 BB instead of making a 100-BB shove available.');
for(const seed of [17,31,49]){const d=AI.choose(deep,{rng:rng(seed),minSamples:400,maxSamples:700});assert.equal(d.type,'raise');assert(d.target>=50&&d.target<=60);console.log(`AA decision seed ${seed}: raise to ${d.target}, stack ${deep.limits.max}`)}
const topPair={hero:0,hole:[c(14),c(13,1)],board:[c(13,2),c(7),c(3,3)],stage:1,button:1,bb:20,current:0,minRaise:20,players:[{id:0,stack:1800,bet:0,total:200,fold:false},{id:1,stack:1800,bet:0,total:200,fold:false}],pending:[0,1],limits:{call:0,min:20,max:1800,canRaise:true},history:[]};
const post=AI.candidates(topPair).filter(a=>a.type==='raise');assert(post.every(a=>a.target<=400));assert(!post.some(a=>a.target===1800));const decision=AI.choose(topPair,{rng:rng(88),minSamples:400,maxSamples:700});assert(decision.type!=='raise'||decision.target<=400);console.log('PASS: top pair with deep stacks bets at most the pot, not the entire stack.');
const short=opening(200);assert(AI.candidates(short).some(a=>a.type==='raise'&&a.target===200));console.log('PASS: 10-BB short-stack all-in remains possible.');
const low={...topPair,players:topPair.players.map(p=>({...p,stack:250})),limits:{...topPair.limits,max:250}};assert(AI.candidates(low).some(a=>a.type==='raise'&&a.target===250));assert(AI.candidates(low).filter(a=>a.type==='raise').every(a=>a.target===250||250-a.target>=50));console.log('PASS: low-SPR shoves remain possible; no near-all-in that leaves a token stack.');
const shortRaise={...short,current:195,limits:{call:195,min:390,max:200,canRaise:true}};assert(AI.candidates(shortRaise).some(a=>a.type==='raise'&&a.target===200));console.log('PASS: legal short all-in raise is retained.');
