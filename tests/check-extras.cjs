const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements=new Map();function el(){return {value:'30',hidden:false,textContent:'',style:{},classList:{toggle(){}},before(){},after(){},prepend(){},setAttribute(){}}}function $(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)}
let now=1000,actions=[],calls=0,intervalFn;const ctx={$,document:{createElement:el,addEventListener(){},hidden:false},window:{},Date:{now:()=>now},Number,Math,Error,String,setInterval(fn){intervalFn=fn;return 1},clearInterval(){},game:{done:false,turn:0,players:[{}],limits(){return {call:calls}},log(){},act(t){actions.push(t);this.done=true}},clearAnalysis(){},schedule(){},console};
$('#reset').onclick=()=>{};vm.createContext(ctx);vm.runInContext(fs.readFileSync('web/extras.js','utf8'),ctx);
vm.runInContext('startTurnClock()',ctx);assert.equal($('#seconds').textContent,'30 s');now+=26000;intervalFn();assert.equal($('#seconds').textContent,'4 s');now+=6000;intervalFn();assert.deepEqual(actions,['call']);
actions=[];calls=20;ctx.game.done=false;$('#thinktime').value='15';vm.runInContext('startTurnClock()',ctx);now+=15000;intervalFn();assert.deepEqual(actions,['fold']);
actions=[];ctx.game.done=false;vm.runInContext('startTurnClock();stopTurnClock()',ctx);now+=60000;assert.deepEqual(actions,[]);
console.log('Clock: countdown, overdue background deadline, automatic check/fold, and cancellation passed.');

