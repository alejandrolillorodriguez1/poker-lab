// A deadline, rather than interval ticks, keeps the clock accurate in background tabs.
let turnDeadline=0,clockInterval,turnSeconds=30;
const timeSetting=document.createElement('label');
timeSetting.innerHTML='Tiempo para pensar <select id="thinktime"><option value="15">15 segundos</option><option value="30" selected>30 segundos</option><option value="60">60 segundos</option></select><small class="timer-help">Al agotarse: pasar si es gratis; retirarse si hay que igualar.</small>';
$('#start').before(timeSetting);
const clockPanel=document.createElement('div');
clockPanel.className='turn-clock';clockPanel.hidden=true;
clockPanel.innerHTML='<div><span>TIEMPO PARA DECIDIR</span><strong id="seconds">30 s</strong></div><div class="clock-track"><i id="clockfill"></i></div>';
$('.controls').prepend(clockPanel);
function stopTurnClock(){clearInterval(clockInterval);clockInterval=undefined;turnDeadline=0;clockPanel.hidden=true}
function startTurnClock(){turnSeconds=Number($('#thinktime').value);turnDeadline=Date.now()+turnSeconds*1000;clockPanel.hidden=false;updateTurnClock();clockInterval=setInterval(updateTurnClock,100)}
function updateTurnClock(){if(!game||game.done||game.turn!==0){stopTurnClock();return}const remaining=Math.max(0,turnDeadline-Date.now());$('#seconds').textContent=Math.ceil(remaining/1000)+' s';$('#clockfill').style.width=(remaining/(turnSeconds*1000)*100)+'%';clockPanel.classList.toggle('urgent',remaining<=5000);if(remaining===0)expireTurn()}
function expireTurn(){if(!game||game.done||game.turn!==0){stopTurnClock();return}stopTurnClock();const type=game.limits(game.players[0]).call?'fold':'call';game.log('Tiempo agotado · '+(type==='fold'?'retirada automática':'paso automático'));game.act(type);clearAnalysis();schedule()}
const resetHandler=$('#reset').onclick;
$('#reset').onclick=()=>{resetHandler();if(!game)stopTurnClock()};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&turnDeadline)updateTurnClock()});

// Original procedural lounge arrangement. No streaming or external audio files.
const musicBar=document.createElement('div');musicBar.className='music-bar';
musicBar.innerHTML='<button id="music" class="quiet" aria-pressed="false">♫ Activar jazz</button><label for="volume">Volumen</label><input id="volume" type="range" min="0" max="100" value="25" aria-label="Volumen de la música"><span id="musicstatus" role="status"></span>';
$('header').after(musicBar);
let audioCtx,master,musicInterval,nextBar=0,barIndex=0,musicOn=false,musicBusy=false;
const progression=[{chord:[60,64,67,71],bass:36},{chord:[57,60,64,67],bass:33},{chord:[62,65,69,72],bass:38},{chord:[59,62,65,69],bass:31}];
const midiHz=n=>440*2**((n-69)/12);
function note(midi,time,duration,level,bass=false){const gain=audioCtx.createGain();gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);gain.connect(master);[1,2,3].forEach((harmonic,i)=>{const osc=audioCtx.createOscillator(),partial=audioCtx.createGain();osc.type='sine';osc.frequency.value=midiHz(midi)*harmonic;partial.gain.value=[1,bass?.12:.24,bass?.025:.07][i];osc.connect(partial);partial.connect(gain);osc.start(time);osc.stop(time+duration+.03)})}
function brush(time,level){const buffer=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*.12),audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();source.buffer=buffer;filter.type='highpass';filter.frequency.value=5000;gain.gain.value=level;source.connect(filter);filter.connect(gain);gain.connect(master);source.start(time)}
function queueBar(time,index){const beat=60/88,p=progression[index%4];[0,1.66,3].forEach((b,j)=>p.chord.forEach((n,i)=>note(n,time+b*beat+i*.012,1.3,.026+(j===0?.008:0))));[p.bass,p.bass+7,p.bass+12,p.bass+7].forEach((n,i)=>note(n,time+i*beat,.52,.085,true));for(let b=0;b<4;b++){brush(time+b*beat,.035);brush(time+(b+2/3)*beat,.016)}const melodies=[[76,79,78,76,74],[76,72,71,69,72],[77,76,74,72,69],[74,77,76,74,71]];melodies[index%4].forEach((n,i)=>note(n,time+[.66,1,1.66,2.66,3.33][i]*beat,.45,.022));return 4*beat}
function queueMusic(){if(!musicOn||audioCtx.state!=='running')return;if(nextBar<audioCtx.currentTime)nextBar=audioCtx.currentTime+.06;while(nextBar<audioCtx.currentTime+.5){nextBar+=queueBar(nextBar,barIndex++)}}
$('#volume').oninput=()=>{if(master)master.gain.setTargetAtTime(Number($('#volume').value)/100,audioCtx.currentTime,.1)};
$('#music').onclick=async()=>{if(musicBusy)return;musicBusy=true;$('#musicstatus').textContent='';try{if(!audioCtx){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)throw Error('unsupported');audioCtx=new AudioContext();master=audioCtx.createGain();master.gain.value=Number($('#volume').value)/100;master.connect(audioCtx.destination)}if(musicOn){musicOn=false;clearInterval(musicInterval);await audioCtx.suspend()}else{await audioCtx.resume();musicOn=true;if(!nextBar)nextBar=audioCtx.currentTime+.08;queueMusic();musicInterval=setInterval(queueMusic,100)}$('#music').textContent=musicOn?'♫ Pausar jazz':'♫ Activar jazz';$('#music').setAttribute('aria-pressed',String(musicOn))}catch(e){musicOn=false;clearInterval(musicInterval);$('#musicstatus').textContent='No se pudo activar el audio en este navegador.'}finally{musicBusy=false}};
