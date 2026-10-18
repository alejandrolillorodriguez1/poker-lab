const names=['Vega','Atlas','Luna','Nico','Iris','Leo','Sofia','Kai'];
const rivalStyleIds=['tag','conservative','lag','balanced','tag','lag','conservative','balanced'];
function shuffled(a){a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const deck=()=>Array.from({length:52},(_,i)=>i);
const rank=c=>c%13+2, suit=c=>Math.floor(c/13);
function evaluate(cards){
 const counts=Array(15).fill(0),suits=[[],[],[],[]];for(const c of cards){const r=rank(c);counts[r]++;suits[suit(c)].push(r)}
 const ranks=[];for(let r=14;r>=2;r--)if(counts[r])ranks.push(r);
 const straight=rs=>{const v=[...new Set(rs)].sort((a,b)=>b-a);if(v.includes(14))v.push(1);let run=1;for(let i=1;i<v.length;i++){run=v[i-1]-v[i]===1?run+1:1;if(run>=5)return v[i]+4}return 0};
 const pack=(cat,tie)=>{let score=cat;for(let k=0;k<5;k++)score=score*15+(tie[k]||0);return score};
 const flush=suits.find(s=>s.length>=5);if(flush){const sf=straight(flush);if(sf)return pack(8,[sf])}
 const quads=ranks.filter(r=>counts[r]===4),trips=ranks.filter(r=>counts[r]>=3),pairs=ranks.filter(r=>counts[r]>=2);
 if(quads.length)return pack(7,[quads[0],ranks.find(r=>r!==quads[0])]);
 if(trips.length){const pair=pairs.find(r=>r!==trips[0]);if(pair)return pack(6,[trips[0],pair])}
 if(flush)return pack(5,flush.slice().sort((a,b)=>b-a).slice(0,5));const st=straight(ranks);if(st)return pack(4,[st]);
 if(trips.length)return pack(3,[trips[0],...ranks.filter(r=>r!==trips[0]).slice(0,2)]);
 if(pairs.length>=2)return pack(2,[pairs[0],pairs[1],ranks.find(r=>r!==pairs[0]&&r!==pairs[1])]);
 if(pairs.length)return pack(1,[pairs[0],...ranks.filter(r=>r!==pairs[0]).slice(0,3)]);
 return pack(0,ranks.slice(0,5))
}
function equity(hole,board,n,iterations=260){let unseen=deck().filter(c=>!hole.includes(c)&&!board.includes(c)),total=0;for(let i=0;i<iterations;i++){let sample=shuffled(unseen),b=board.concat(sample.splice(0,5-board.length)),me=evaluate(hole.concat(b)),max=me,ties=1;for(let j=0;j<n;j++){let v=evaluate(sample.splice(0,2).concat(b));if(v>max){max=v;ties=1}else if(v===max)ties++}if(me===max)total+=1/ties}return total/iterations}
class Game{
 constructor(ids,stack){const styles=shuffled(rivalStyleIds);this.players=[{name:'Tú',human:true},...ids.map((i,j)=>({name:names[i],profile:styles[j]}))].map((p,i)=>({...p,id:i,stack,hole:[],out:false,stats:{hands:0,vpip:0,pfr:0,facedBet:0,foldsToBet:0,raises:0,calls:0,checks:0}}));this.initial=stack*this.players.length;this.button=-1;this.hand=0;this.logs=[];this.done=true;this.bb=20;this.start()}
 observe(p,event){const stats=p.stats;if(event.call>0){stats.facedBet++;if(event.action==='fold')stats.foldsToBet++}if(event.action==='raise')stats.raises++;if(event.action==='call')stats.calls++;if(event.action==='check')stats.checks++;if(event.stage===0&&(event.action==='raise'||event.action==='call')&&event.paid>0){if(!p.enteredHand){stats.vpip++;p.enteredHand=true}if(event.action==='raise'&&!p.raisedHand){stats.pfr++;p.raisedHand=true}}}
 log(s){this.logs.unshift(s);this.logs=this.logs.slice(0,60)}
 next(i,predicate){for(let n=1;n<=this.players.length;n++){let j=(i+n)%this.players.length;if(predicate(this.players[j]))return j}return -1}
 pay(p,n){n=Math.min(p.stack,n);p.stack-=n;p.bet+=n;p.total+=n;return n}
 start(){if(this.players.filter(p=>p.stack>0).length<2||this.players[0].stack===0){this.finished=true;return}this.handHistory=[];this.decisions=[];this.results=[];this.hand++;this.bb=20*Math.pow(2,Math.floor((this.hand-1)/10));this.button=this.next(this.button,p=>p.stack>0);this.cards=shuffled(deck());this.board=[];this.stage=0;this.done=false;this.reveal=false;this.players.forEach(p=>{p.out=p.stack===0;if(!p.out)p.stats.hands++;p.enteredHand=false;p.raisedHand=false;p.fold=p.out;p.bet=0;p.total=0;p.hole=p.out?[]:[this.cards.pop(),this.cards.pop()];p.analysis=null;p.action=p.out?'Eliminado':''});let active=this.players.filter(p=>!p.out).length;let sb=active===2?this.button:this.next(this.button,p=>!p.out),bb=this.next(sb,p=>!p.out);this.pay(this.players[sb],this.bb/2);this.pay(this.players[bb],this.bb);this.current=this.bb;this.minRaise=this.bb;this.pending=new Set(this.players.filter(p=>!p.fold&&p.stack>0).map(p=>p.id));this.acted=new Set();this.turn=this.next(bb,p=>this.pending.has(p.id));this.log('Mano '+this.hand+' · ciegas '+this.bb/2+'/'+this.bb);this.advance()}
 pot(){return this.players.reduce((s,p)=>s+p.total,0)}
 limits(p){return {call:Math.min(p.stack,Math.max(0,this.current-p.bet)),min:this.current+this.minRaise,max:p.bet+p.stack,canRaise:!this.acted.has(p.id)&&this.players.some(q=>q.id!==p.id&&!q.fold&&q.stack>0)}}
 act(type,target){if(this.done)return;let p=this.players[this.turn],l=this.limits(p);const beforeTotal=p.total,event={player:p.id,stage:this.stage,board:this.board.slice(),action:type,call:l.call,pot:this.pot()};if(type==='fold'){p.fold=true;p.action='Se retira'}else if(type==='raise'){if(!Number.isFinite(target)||!Number.isInteger(target)||!l.canRaise||target<=this.current||target>l.max||(target<l.min&&target!==l.max))return false;let old=this.current;this.pay(p,target-p.bet);this.current=p.bet;let full=this.current-old>=this.minRaise;if(full){this.minRaise=this.current-old;this.acted.clear()}this.pending=new Set(this.players.filter(q=>q.id!==p.id&&!q.fold&&q.stack>0&& (full||q.bet<this.current)).map(q=>q.id));p.action=p.stack?'Sube a '+p.bet:'All-in '+p.bet}else{let paid=this.pay(p,l.call);p.action=paid?'Iguala '+paid:'Pasa'}event.paid=p.total-beforeTotal;if(type==='call')event.action=event.paid?'call':'check';this.observe(p,event);this.handHistory.push(event);this.log(p.name+': '+p.action);this.pending.delete(p.id);this.acted.add(p.id);this.turn=this.next(p.id,q=>this.pending.has(q.id));this.advance();return true}
 advance(){if(this.players.filter(p=>!p.fold).length===1){let p=this.players.find(p=>!p.fold);this.results.push({amount:this.pot(),winners:[p.id],awards:{[p.id]:this.pot()}});p.stack+=this.pot();this.log(p.name+' gana '+this.pot()+' fichas');this.end();return}this.pending.forEach(id=>{let p=this.players[id];if(p.fold||p.stack===0)this.pending.delete(id)});if(this.pending.size===1){let p=this.players[[...this.pending][0]];if(p.bet>=this.current&&this.players.filter(q=>!q.fold&&q.stack>0).length===1)this.pending.clear()}if(this.pending.size){if(!this.pending.has(this.turn))this.turn=[...this.pending][0];return}if(this.stage===3){this.showdown();return}this.stage++;let count=this.stage===1?3:1;for(let i=0;i<count;i++)this.board.push(this.cards.pop());this.players.forEach(p=>p.bet=0);this.current=0;this.minRaise=this.bb;this.acted=new Set();this.pending=new Set(this.players.filter(p=>!p.fold&&p.stack>0).map(p=>p.id));if(this.pending.size<=1){this.pending.clear();this.advance();return}this.turn=this.next(this.button,p=>this.pending.has(p.id));this.log(['Preflop','Flop','Turn','River'][this.stage])}
 showdown(){this.reveal=true;let levels=[...new Set(this.players.map(p=>p.total).filter(Boolean))].sort((a,b)=>a-b),prev=0;for(let level of levels){let contributors=this.players.filter(p=>p.total>=level),amount=(level-prev)*contributors.length,eligible=contributors.filter(p=>!p.fold);if(!eligible.length)eligible=contributors;let max=Math.max(...eligible.map(p=>evaluate(p.hole.concat(this.board)))),winners=eligible.filter(p=>evaluate(p.hole.concat(this.board))===max);let ordered=[];for(let n=1;n<=this.players.length;n++){let p=this.players[(this.button+n)%this.players.length];if(winners.includes(p))ordered.push(p)}ordered.forEach((p,i)=>p.stack+=Math.floor(amount/winners.length)+(i<amount%winners.length?1:0));this.results.push({amount,winners:ordered.map(p=>p.id),awards:Object.fromEntries(ordered.map((p,i)=>[p.id,Math.floor(amount/ordered.length)+(i<amount%ordered.length?1:0)]))});this.log(ordered.map(p=>p.name).join(' y ')+' gana '+amount+' · '+handName(max));prev=level}this.end()}
 end(){this.done=true;this.turn=-1;this.players.forEach(p=>{p.total=0;p.bet=0;if(!p.stack)p.action='Eliminado'});this.finished=this.players[0].stack===0||this.players.filter(p=>p.stack>0).length===1}
 ai(options){const strategy=typeof PokerStrategy!=='undefined'?PokerStrategy:require('./strategy.js');const decision=strategy.decide(this,this.players[this.turn],options);return this.executeAI(decision)}
 executeAI(decision){if(this.done)return;const p=this.players[this.turn];p.analysis=decision.analysis;this.decisions.push({name:p.name,stage:this.stage,type:decision.type,target:decision.target,analysis:decision.analysis});return this.act(decision.type,decision.target)}

}
function handName(score){return ['Carta alta','Pareja','Doble pareja','Trío','Escalera','Color','Full house','Póker','Escalera de color'][Math.floor(score/15**5)]}
if(typeof module!=='undefined')module.exports={Game,evaluate,equity,handName,rank,suit,rivalStyleIds};







