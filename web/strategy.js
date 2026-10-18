// EV search over a finite set of legal actions. The response and range models
// are approximations, not an equilibrium solver. No opponent cards enter this module.
const PokerStrategy=((core)=>{
 const {evaluate,rank,suit}=core;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const profiles={
  balanced:{label:'Equilibrado',description:'Alterna valor y presión con prudencia.',entry:.44,late:.14,risk:.008,pressure:.12,mix:.06,rangeShift:0,bluff:.055,callShift:0},
  tag:{label:'Selectivo-agresivo',description:'Elige sus manos y presiona cuando entra.',entry:.49,late:.14,risk:.009,pressure:.28,mix:.05,rangeShift:.055,bluff:.04,callShift:.015},
  conservative:{label:'Conservador',description:'Entra con menos manos y controla el riesgo.',entry:.57,late:.12,risk:.022,pressure:-.22,mix:.035,rangeShift:.11,bluff:.018,callShift:.045},
  lag:{label:'Activo-agresivo',description:'Abre más manos en posición y usa más presión.',entry:.37,late:.15,risk:.003,pressure:.42,mix:.085,rangeShift:-.065,bluff:.095,callShift:-.012}
 };
 const rivalProfiles=core.rivalStyleIds;
 function profile(player){return profiles[player?.profile]||profiles.balanced}
 function positionInfo(s,id){const alive=s.players.filter(p=>!p.out),around=[];for(let step=1;step<=s.players.length;step++){const p=s.players[(s.button+step)%s.players.length];if(!p.out)around.push(p.id)}const cutoff=around[around.length-2],late=id===s.button?1:id===cutoff&&alive.length>3?.75:0;const post=around.filter(pid=>!s.players.find(p=>p.id===pid).fold),index=post.indexOf(id);return {late,post:post.length<=1?1:Math.max(0,index)/(post.length-1)}}
 function observedProfile(s,id){const p=s.players.find(p=>p.id===id),base=profile(p),stats=p?.stats;if(!stats||stats.hands<8)return base;const weight=stats.hands/(stats.hands+30),vpip=stats.vpip/Math.max(1,stats.hands),pfr=(stats.pfr||0)/Math.max(1,stats.hands),foldRate=stats.foldsToBet/Math.max(1,stats.facedBet);return {...base,rangeShift:clamp(base.rangeShift+weight*((.28-vpip)*.3+(.18-pfr)*.12),-.12,.16),callShift:clamp(base.callShift+weight*(foldRate-.5)*.08,-.05,.07)}}
 const fullDeck=()=>Array.from({length:52},(_,i)=>i);
 function shuffle(a,rng){a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function snapshot(game,hero){return {hero:hero.id,hole:hero.hole.slice(),board:game.board.slice(),stage:game.stage,button:game.button,bb:game.bb,current:game.current,minRaise:game.minRaise,players:game.players.map(p=>({id:p.id,name:p.name,profile:p.id===hero.id?p.profile:undefined,stats:p.stats?{...p.stats}:undefined,stack:p.stack,bet:p.bet,total:p.total,fold:p.fold,out:p.out})),pending:[...game.pending],limits:game.limits(hero),history:(game.handHistory||[]).map(h=>({...h,board:h.board.slice()}))}}
 function strength(hole,board){const r=hole.map(rank).sort((a,b)=>b-a),suited=suit(hole[0])===suit(hole[1]),gap=r[0]-r[1];
  const pre=r[0]===r[1]?.46+(r[0]-2)*.04:clamp(.1+(r[0]-2)*.025+(r[1]-2)*.012+(suited?.055:0)+(gap<=2?.065:0)+(r[1]>=10?.06:0),.05,.82);
  if(board.length<3)return pre;
  const score=evaluate(hole.concat(board)),category=Math.floor(score/15**5);let s=[.12,.4,.64,.75,.82,.89,.95,.985,.999][category];
  if(category===0)s+=rank(hole[0])===14||rank(hole[1])===14?.09:.025;
  if(category===1){const pair=Math.floor(score/15**4)%15,top=Math.max(...board.map(rank));s+=(pair>=top?.15:pair>=top-3?.07:0);if(!hole.some(c=>rank(c)===pair))s-=.11}
  if(board.length<5){const cards=hole.concat(board),ss=[0,0,0,0];cards.forEach(c=>ss[suit(c)]++);if(ss.some((n,i)=>n===4&&hole.some(c=>suit(c)===i)))s+=.10;const rr=new Set(cards.map(rank));if(rr.has(14))rr.add(1);for(let low=1;low<=10;low++){let count=0;for(let k=low;k<low+5;k++)if(rr.has(k))count++;if(count===4&&hole.some(c=>rank(c)>=low&&rank(c)<low+5)){s+=.06;break}}}
  return clamp(s,.04,.999)
 }
 function actionLikelihood(hole,event,style=profiles.balanced,position={late:0}){const s=strength(hole,event.board),size=event.paid/Math.max(1,event.pot),cost=event.call/Math.max(1,event.pot+event.call),shift=style.rangeShift-(event.stage===0?position.late*.08:0);
  if(event.action==='raise'){const threshold=clamp(.38+Math.log1p(size)*.17+(event.stage===0?.05:0)+shift,.25,.9);return style.bluff+.89/(1+Math.exp(-(s-threshold)*12))}
  if(event.action==='call'){const threshold=clamp(.18+cost*.7+shift,.12,.8);return .08+.84/(1+Math.exp(-(s-threshold)*10))}
  if(event.action==='check')return clamp(.96-.48*s,.35,.96);
  return 1
 }
 function makeRange(s,id){const known=new Set(s.hole.concat(s.board)),available=fullDeck().filter(c=>!known.has(c)),events=s.history.filter(h=>h.player===id&&h.action!=='fold'),style=observedProfile(s,id),position=positionInfo(s,id);let entries=[],cumulative=0;
  for(let a=0;a<available.length-1;a++)for(let b=a+1;b<available.length;b++){const hole=[available[a],available[b]];let weight=1;for(const event of events)weight*=actionLikelihood(hole,event,style,position);weight=Math.max(1e-8,weight);cumulative+=weight;entries.push({hole,weight,cumulative})}
  return {entries,total:cumulative}
 }
 function sampleRange(range,used,rng){for(let t=0;t<80;t++){let v=rng()*range.total,lo=0,hi=range.entries.length-1;while(lo<hi){let mid=(lo+hi)>>1;if(range.entries[mid].cumulative<v)lo=mid+1;else hi=mid}let h=range.entries[lo].hole;if(!h.some(c=>used.has(c)))return h}
  const remaining=range.entries.filter(e=>!e.hole.some(c=>used.has(c)));let sum=remaining.reduce((a,e)=>a+e.weight,0),v=rng()*sum;for(const e of remaining){v-=e.weight;if(v<=0)return e.hole}return remaining[remaining.length-1].hole
 }
 function payout(hero,players,totals,folds,scores){const levels=[...new Set(totals.filter(n=>n>0))].sort((a,b)=>a-b);let previous=0,win=0;for(const level of levels){let contributors=[],eligible=[];players.forEach((p,i)=>{if(totals[i]>=level){contributors.push(i);if(!folds[i])eligible.push(i)}});const amount=(level-previous)*contributors.length;previous=level;
   // Unmatched bets are returned, and cannot inflate the EV of a large raise.
   if(contributors.length===1){if(contributors[0]===hero)win+=amount;continue}
   if(!eligible.includes(hero))continue;const best=Math.max(...eligible.map(i=>scores[i]));if(scores[hero]===best)win+=amount/eligible.filter(i=>scores[i]===best).length
  }return win
 }
 function eligiblePot(s){const hero=s.players.find(p=>p.id===s.hero),cap=hero.total+s.limits.call;return s.players.reduce((sum,p)=>sum+Math.min(p.total,cap),0)+s.limits.call}
 function bettingContext(s){const h=s.players.find(p=>p.id===s.hero),opponents=s.players.filter(p=>p.id!==s.hero&&!p.fold),effectiveCap=Math.min(s.limits.max,Math.max(...opponents.map(p=>p.bet+p.stack))),effectiveRemaining=Math.max(0,effectiveCap-h.bet),pot=s.players.reduce((sum,p)=>sum+p.total,0)+s.limits.call,raises=s.history.filter(e=>e.stage===0&&e.action==='raise').length;
  // The rollout omits later betting rounds. Deep shoves therefore receive an
  // unrealistic advantage with strong hands. Use conventional street sizing
  // rather than treating an arbitrarily large stack as a normal value bet.
  const shortPreflop=effectiveRemaining<=15*s.bb,committedPreflop=raises>=2&&effectiveCap<=4*s.current,lowSPR=effectiveRemaining<=1.25*Math.max(s.bb,pot);
  return {effectiveCap,effectiveRemaining,pot,allowShove:s.stage===0?shortPreflop||committedPreflop:lowSPR}
 }
 function candidates(s){const l=s.limits,h=s.players.find(p=>p.id===s.hero),result=[{type:'call',target:h.bet+l.call,label:l.call?'Igualar':'Pasar'}];if(l.call)result.unshift({type:'fold',target:h.bet,label:'Retirarse'});
  if(l.canRaise){const context=bettingContext(s),{effectiveCap:cap,pot,allowShove}=context;let targets;
   if(s.stage===0){const raises=s.history.filter(e=>e.stage===0&&e.action==='raise').length;
    // Open around 2.5–3 BB, add one BB per limper. Subsequent raises are
    // 2.5–3.5 times the current bet, rather than an automatic 100-BB jam.
    const limpers=s.history.filter(e=>e.stage===0&&e.action==='call').length;
    targets=raises===0?[s.bb*(2.5+limpers),s.bb*(3+limpers)]:[s.current*2.5,s.current*3,s.current*3.5];
   }else targets=[.33,.5,.75,1].map(f=>s.current+pot*f);
   targets=targets.map(n=>Math.min(cap,Math.max(l.min,Math.round(n))));if(allowShove)targets.push(cap);if(l.max<l.min)targets=allowShove?[l.max]:[];
   [...new Set(targets)].sort((a,b)=>a-b).forEach(target=>{const remaining=cap-target,leavesTokenStack=remaining>0&&remaining<Math.max(s.bb,context.effectiveRemaining*.2);
    if(target>s.current&&target<=l.max&&target<=cap&&(target>=l.min||target===l.max)&&!leavesTokenStack&&(target<cap||allowShove))result.push({type:'raise',target,label:target===l.max?'All-in':'Subir a '+target})
   })
  }
  const unopened=s.stage===0&&!s.history.some(e=>e.stage===0&&e.action==='raise'),style=profile(h),entryThreshold=style.entry-style.late*positionInfo(s,s.hero).late;
  if(unopened&&h.profile&&h.stack>3*s.bb&&strength(s.hole,[])<entryThreshold)return result.filter(a=>a.type==='fold'||a.type==='call'&&!l.call);
  return result
 }
 function chooseBest(actions,means){let best=0;for(let i=1;i<actions.length;i++)if(means[i]>means[best]+1e-9)best=i;return best}
 function responseEquity(hole,s,opponentIds,ranges,actionIndex,rng,cache){const key=hole.slice().sort((a,b)=>a-b).join(',')+'|'+opponentIds.join(',')+'|'+actionIndex;if(!cache.has(key)){let wins=0;const trials=24,n=opponentIds.length;
   for(let t=0;t<trials;t++){const used=new Set(hole.concat(s.board)),otherHoles=[];for(const id of shuffle(opponentIds,rng)){const h=sampleRange(ranges.get(id),used,rng);otherHoles.push(h);h.forEach(c=>used.add(c))}const sample=shuffle(fullDeck().filter(c=>!used.has(c)),rng),b=s.board.concat(sample.slice(0,5-s.board.length)),v=evaluate(hole.concat(b));let best=v,ties=1;for(const h of otherHoles){const other=evaluate(h.concat(b));if(other>best){best=other;ties=1}else if(other===best)ties++}if(v===best)wins+=1/ties}
   cache.set(key,(wins+1/(n+1))/(trials+1))
  }return cache.get(key)
 }
 function continuationChance(eq,odds,s,player,aggression){const position=positionInfo(s,player.id),style=observedProfile(s,player.id);return clamp(.025+.95/(1+Math.exp(-(eq-odds-.015-style.callShift)*20))+(aggression?.015*position.post:0),.015,.985)}
 function drawPotential(hole,board){if(board.length<3||board.length===5)return 0;const cards=hole.concat(board),suits=[0,0,0,0],ranks=new Set(cards.map(rank));cards.forEach(c=>suits[suit(c)]++);let draw=suits.some((n,i)=>n===4&&hole.some(c=>suit(c)===i))?.7:0;if(ranks.has(14))ranks.add(1);for(let low=1;low<=10;low++){let n=0;for(let r=low;r<low+5;r++)if(ranks.has(r))n++;if(n===4&&hole.some(c=>rank(c)>=low&&rank(c)<low+5)){draw+=.35;break}}return Math.min(1,draw)}
 function selectPolicy(s,actions,means,squares,n,rng){const hero=s.players.find(p=>p.id===s.hero),style=profile(hero),best=chooseBest(actions,means),band=Math.min(s.bb*.65,Math.max(s.bb*.2,eligiblePot(s)*.015)),pos=positionInfo(s,s.hero),draw=drawPotential(s.hole,s.board),scores=means.map((ev,i)=>{const a=actions[i],sd=Math.sqrt(Math.max(0,squares[i]/n-ev*ev)),isShove=a.type==='raise'&&a.target===s.limits.max,bias=a.type==='raise'&&!isShove?s.bb*style.pressure*(.35+(s.stage===0?pos.late:pos.post)*.35+draw*.3):0;return ev-style.risk*sd+bias});
  if(!hero.profile)return {index:best,scores,band:0};
  const eligible=actions.map((a,i)=>i).filter(i=>means[i]>=means[best]-band&&(means[i]>=0||!s.limits.call&&actions[i].type==='call'));
  if(!eligible.length)return {index:best,scores,band};const max=Math.max(...eligible.map(i=>scores[i])),temperature=Math.max(.1,s.bb*style.mix),weights=eligible.map(i=>Math.exp((scores[i]-max)/temperature));let ticket=rng()*weights.reduce((sum,w)=>sum+w,0);for(let k=0;k<eligible.length;k++){ticket-=weights[k];if(ticket<=0)return {index:eligible[k],scores,band}}return {index:eligible[eligible.length-1],scores,band}
 }
 function simulate(s,action,world,cache,rng,responseRanges,actionIndex){if(action.type==='fold')return 0;const heroIndex=s.players.findIndex(p=>p.id===s.hero),hero=s.players[heroIndex],totals=s.players.map(p=>p.total),folds=s.players.map(p=>p.fold),bets=s.players.map(p=>p.bet);const extra=Math.min(hero.stack,Math.max(0,action.target-hero.bet));totals[heroIndex]+=extra;bets[heroIndex]+=extra;let target=Math.max(s.current,bets[heroIndex]);
  const ordered=[];for(let step=1;step<s.players.length;step++)ordered.push((heroIndex+step)%s.players.length);
  for(const i of ordered){const p=s.players[i];if(p.fold||p.stack===0)continue;const responding=action.type==='raise'?bets[i]<target:s.pending.includes(p.id);if(!responding)continue;const call=Math.min(p.stack,Math.max(0,target-bets[i]));if(!call)continue;
   const cap=p.total+call,pot=totals.reduce((sum,n)=>sum+Math.min(n,cap),0)+call,odds=call/Math.max(1,pot);
   // A large raise does not mean every remaining seat will call. Otherwise a
   // jammer can wrongly appear to make even premium hands fold in a full table.
   const committed=s.players.filter((q,j)=>j!==i&&!folds[j]&&(q.id===s.hero||q.stack===0||bets[j]>=target)).map(q=>q.id),possible=s.players.filter((q,j)=>j!==i&&!folds[j]&&!committed.includes(q.id)).map(q=>q.id),futureCount=Math.round(possible.length*clamp(1-odds/.25,0,.7)),opponentIds=committed.concat(possible.slice(0,futureCount)),eq=responseEquity(world.holes[i],s,opponentIds,responseRanges,actionIndex,rng,cache),chance=continuationChance(eq,odds,s,p,action.type==='raise');
   if(world.responses[i]>chance)folds[i]=true;else{totals[i]+=call;bets[i]+=call}
  }
  return payout(heroIndex,s.players,totals,folds,world.scores)-extra
 }
 function choose(s,options={}){const rng=options.rng||Math.random,minSamples=options.minSamples||400,maxSamples=options.maxSamples||1000,batch=100;const actions=candidates(s),opponents=s.players.filter(p=>!p.fold&&p.id!==s.hero),ranges=new Map(opponents.map(p=>[p.id,makeRange(s,p.id)])),sums=actions.map(()=>0),squares=actions.map(()=>0),cross=actions.map(()=>actions.map(()=>0)),cache=new Map();let equitySum=0,n=0,uncertain=true;
  // A heads-up river call against an all-in has no subsequent decisions.
  // Enumerate every possible opposing holding instead of sampling it.
  if(s.board.length===5&&opponents.length===1&&opponents[0].stack===0){const heroIndex=s.players.findIndex(p=>p.id===s.hero),opponentIndex=s.players.findIndex(p=>p.id===opponents[0].id),hero=s.players[heroIndex],range=ranges.get(opponents[0].id),heroScore=evaluate(s.hole.concat(s.board)),means=actions.map(()=>0);let eq=0;
   for(const entry of range.entries){const scores=s.players.map(()=>-1);scores[heroIndex]=heroScore;scores[opponentIndex]=evaluate(entry.hole.concat(s.board));eq+=entry.weight*(scores[heroIndex]>scores[opponentIndex]?1:scores[heroIndex]===scores[opponentIndex]?.5:0);actions.forEach((a,i)=>{if(a.type==='fold')return;const totals=s.players.map(p=>p.total),extra=Math.min(hero.stack,Math.max(0,a.target-hero.bet));totals[heroIndex]+=extra;means[i]+=entry.weight*(payout(heroIndex,s.players,totals,s.players.map(p=>p.fold),scores)-extra)})}
   means.forEach((v,i)=>means[i]=v/range.total);const best=chooseBest(actions,means);return {...actions[best],analysis:{eq:eq/range.total,odds:s.limits.call/Math.max(1,eligiblePot(s)),samples:range.entries.length,exact:true,uncertain:false,alternatives:actions.map((a,i)=>({...a,ev:means[i],se:0})),model:'enumeración exacta del river contra un rival all-in, ponderada por el rango estimado'}}
  }
  // Each responding player knows its own sampled cards, not the hero's cards.
  // Their belief in the hero's hand is conditioned on the proposed action.
  const publicState={...s,hole:[]},publicRanges=new Map(s.players.filter(p=>!p.fold).map(p=>[p.id,makeRange(publicState,p.id)])),hero=s.players.find(p=>p.id===s.hero),responseModels=actions.map(a=>{const r=new Map(publicRanges);if(a.type!=='fold'){const paid=Math.max(0,a.target-hero.bet),event={player:s.hero,stage:s.stage,board:s.board,action:a.type==='raise'?'raise':paid?'call':'check',paid,call:s.limits.call,pot:s.players.reduce((sum,p)=>sum+p.total,0)};r.set(s.hero,makeRange({...publicState,history:s.history.concat(event)},s.hero))}return r});
  while(n<maxSamples){const stop=Math.min(maxSamples,n+batch);for(;n<stop;n++){let used=new Set(s.hole.concat(s.board)),holes=s.players.map(()=>null),heroIndex=s.players.findIndex(p=>p.id===s.hero);holes[heroIndex]=s.hole;
    for(const p of shuffle(opponents,rng)){let h=sampleRange(ranges.get(p.id),used,rng);holes[s.players.findIndex(q=>q.id===p.id)]=h;h.forEach(c=>used.add(c))}
    const sample=shuffle(fullDeck().filter(c=>!used.has(c)),rng),board=s.board.concat(sample.slice(0,5-s.board.length)),scores=holes.map(h=>h?evaluate(h.concat(board)):-1),best=Math.max(...scores),tied=scores.filter(v=>v===best).length;equitySum+=scores[heroIndex]===best?1/tied:0;
    const world={holes,scores,responses:s.players.map(()=>rng())},values=actions.map((a,i)=>simulate(s,a,world,cache,rng,responseModels[i],i));values.forEach((v,i)=>{sums[i]+=v;squares[i]+=v*v;values.forEach((w,j)=>cross[i][j]+=v*w)})
   }
   if(n>=minSamples){const means=sums.map(v=>v/n),best=chooseBest(actions,means);uncertain=actions.some((a,i)=>{if(i===best)return false;const mean=means[best]-means[i],variance=Math.max(0,(squares[best]+squares[i]-2*cross[best][i])/n-mean*mean),se=Math.sqrt(variance/Math.max(1,n-1));return mean<=1.96*se});if(!uncertain)break}
  }
  const means=sums.map(v=>v/n),policy=selectPolicy(s,actions,means,squares,n,rng),best=policy.index,pot=eligiblePot(s);return {...actions[best],analysis:{eq:equitySum/n,odds:s.limits.call/Math.max(1,pot),samples:n,uncertain,profile:profile(s.players.find(p=>p.id===s.hero)).label,policyBand:policy.band,alternatives:actions.map((a,i)=>({...a,ev:means[i],policyScore:policy.scores[i],se:Math.sqrt(Math.max(0,squares[i]/n-means[i]**2)/Math.max(1,n-1))})),model:'rangos, posición, perfil y mezcla entre opciones rentables cercanas; sin apuestas futuras ni resubidas'}}
 }
 function decide(game,hero,options){return choose(snapshot(game,hero),options)}
 return {snapshot,choose,decide,candidates,bettingContext,chooseBest,payout,eligiblePot,strength,actionLikelihood,makeRange,continuationChance,profiles,rivalProfiles,profile,positionInfo,observedProfile,drawPotential,selectPolicy};
})(typeof module!=='undefined'?require('./engine.js'):{evaluate,rank,suit,rivalStyleIds});
if(typeof module!=='undefined')module.exports=PokerStrategy;

