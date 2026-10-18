const installButton=document.createElement('button');installButton.id='installApp';installButton.className='quiet';installButton.textContent='Instalar app';$('header').append(installButton);
const installHelp=document.createElement('dialog');installHelp.id='installHelp';installHelp.innerHTML='<h2>Poker Lab en tu Android</h2><p id="installMessage">Abre esta página en Chrome. En el menú ⋮, toca «Instalar aplicación» o «Añadir a la pantalla de inicio».</p><p class="small">La primera apertura necesita conexión. La mesa, la IA y el jazz están incluidos en la app.</p><button id="closeInstall" class="primary">Entendido</button>';
document.body.append(installHelp);$('#closeInstall').onclick=()=>installHelp.close();let installPrompt=null;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
function updateInstallButton(){installButton.hidden=standalone()}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;updateInstallButton()});window.addEventListener('appinstalled',()=>{installPrompt=null;installButton.hidden=true});
installButton.onclick=async()=>{if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();await prompt.userChoice}catch(error){installHelp.showModal()}return}$('#installMessage').textContent=location.protocol==='file:'?'Para instalarla en tu teléfono, primero necesita estar publicada en una dirección HTTPS. Este archivo local permite probarla en el ordenador.':'Abre esta página en Chrome. En el menú ⋮, toca «Instalar aplicación» o «Añadir a la pantalla de inicio». Si no aparece, úsala en el navegador mientras Chrome comprueba los requisitos.';installHelp.showModal()};updateInstallButton();
// Offline cache is limited to game assets from this origin. No login pages or
// account responses are cached. Installation is optional and never automatic.
if('serviceWorker' in navigator&&window.isSecureContext&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
$('#amount').setAttribute('inputmode','numeric');
