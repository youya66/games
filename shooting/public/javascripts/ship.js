import Point from "./common";

class Ship{
	constructor(){
		this.position = new Point();
		this.size = 0;
		this.life = 0;
		this.max_life = 3
		this.firing_speed = 0;
		this.invincible = false;
		this.tmp = 0;
	}
	set(obj){
		for(let prop in obj){
			let variable = obj[prop];

			try{
				if(!this.hasOwnProperty(prop)){
					throw "ship class instance don't have proparty";
				}
			}catch(e){
				console.error(e);
				continue;
			}

			if(variable instanceof Object && !(variable instanceof Array)){
				for(let __prop in variable){
					let __variable = variable[__prop];
					try{
						if(!this[prop].hasOwnProperty(__prop)){
							throw "ship class instance indent don't have proparty"
						}
					}catch(e){
						console.error(e);
						continue;
					}
					this[prop][__prop] = __variable;
				}
			}else{
				this[prop] = variable;
			}
		}
	}
	change_state(type){
		switch (type){
			// hp down
			case 0:
				break;
			// hp up
			case 1:
				this.life + 1 <= global.ship.max_life ? 
					global.ship.life + 1:
					global.ship.life
				break;
			// attack evolution 
			case 2:
				break;
		}
		this.invincible = true;
		setTimeout(()=>{
			this.invincible = false
		},1000)
	}
}

module.exports = Ship;