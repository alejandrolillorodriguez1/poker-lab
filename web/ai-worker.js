importScripts('engine.js','strategy.js');
self.onmessage=event=>{const {id,snapshot}=event.data;try{self.postMessage({id,decision:PokerStrategy.choose(snapshot)})}catch(error){self.postMessage({id,error:error.message})}};
