import "./game"

(function main () {
	// 初期化
	let root = self;
	root.$ = {};
	
	$.dom = {};
	$.canvases = {};
	$.contexts = {};
	$.last_touch_target;
	let sprt = Game.sprt;
	let collections = Game.init_assets([
		{
			name: "player",
			type: "image",
			src: "./images/player.png"
		},{
			name: "zombie1",
			type: "image",
			src: "./images/zombie1.png"
		},{
			name: "zombie2",
			type: "image",
			src: "./images/zombie2.png"
		},{
			name: "dungeon",
			type: "image",
			src: "./images/dungeon.png"
		},{
			name: "field1",
			type: "xml",
			src: "./field1.xml"
		}
	]);

	$.core = new Game.Core(512, 512);
	$.game = new Game.Game();
	$.core.add_game($.game);

	window.addEventListener("DOMContentLoaded",()=>{
		$.core.setup("touch_move", "touch_end");
		
		// Gameオブジェクト外シーンを作成する
		let title_menu = new Game.OutScene("title_menu",create_title_menu());
		title_menu.on("change_scene", function (e) {
			console.log($.core.state);
			if($.core.state === "title_menu"){
				$.core.show_if();
				this.show();
			}else if($.core.state !== "gameover_menu"){
				$.core.hide_if();
				this.hide();
			}
		})

		let gameover_menu = new Game.OutScene("gameover_menu",create_gameover_menu());
		gameover_menu.on("change_scene", function (e) {
			if($.core.state === "gameover_menu"){
				let {m,s} = Game.conversion_time($.core.elapsed_time, true);
				this.dom[2].innerHTML = "SCORE: " + m + s;
				$.core.show_if();
				this.show();
			}else if($.core.state !== "title_menu"){
				$.core.hide_if();
				this.hide();
			}
		})
		
		// coreに外シーンシーンを追加
		$.core.add_scene(title_menu);
		$.core.add_scene(gameover_menu)
		
		// タイトル画面を表示するためのstate
		$.core.store_game_state("title_menu");

		// シーンが変わった時のイベントを追加
		// TODO: ここの処理もっと改善できる(game.onload)
		$.core.on("change_scene", function(e){
			let state = e.target.state;
			if(state === "loading"){
				load(this.game_object);
			}else if(state === "playing"){
				// filed
				$.filed = render_filed($.game, this.w, this.h);
				$.game.add_filed($.filed);

				// player
				$.player = render_player($.game);
				$.game.add_player($.player);
				$.player.on("enter_frame", function () {
					this.move();
					this.shot();
				})

				// cpu
				$.cpu = render_cpu($.game);
				$.game.add_player($.cpu);

				let action = false;
				$.player.shot = function () {
					if($.core.input === 32){
						if(action){
							return
						}
						action = true;
						let bullet = render_bullet.call(this);
						this.add_child(bullet);
						bullet.on("enter_frame", function() {
							this.frame += 1;
							this.move(5);
							if(this.x < 0 || this.x >= $.core.w ||
								this.y < 0 || this.y >= $.core.h ||
								!this.alive){
								$.player.remove_child(this);
								action = false;
							}
							$.filed.enemys.map((enemy) => {
								if(this.is_intersect(enemy)){
									this.alive = false;
									enemy.running = false;
									setTimeout(function () {
										enemy.running = true;
									}, 500);
								};
							})
						})
					}
				}

				$.player.move = function() {
					let direction = this.direction

					//TODO: 0 1 0 2 
					this.sprite_x = this.sprite_pos[direction][1].x;
					this.sprite_y = this.sprite_pos[direction][1].y;
					if(this.is_moveing){
						switch($.core.frame % 6){
							case 2:
							case 3:
								this.sprite_x = this.sprite_pos[direction][0].x;
								this.sprite_y = this.sprite_pos[direction][0].y;
								break;
							case 4:
							case 5:
								this.sprite_x = this.sprite_pos[direction][2].x;
								this.sprite_y = this.sprite_pos[direction][2].y;
								break;
						}
						this.move_by(this.x_movement, this.y_movement);
						let id = $.game.filed_id;
						let filed = $.game.entity.filed[id];
						if((this.x % filed.sprite_w === 0) && (this.y % filed.sprite_h === 0)){
							this.is_moveing = false;
						}
					}else{
						this.x_movement = 0;
						this.y_movement = 0;
						switch($.core.input){
							case 38:
								this.y_movement = -2;
								this.direction = "up"
								break;
							case 37:
								this.x_movement = -2
								this.direction = "left"
								break;
							case 39:
								this.x_movement = 2
								this.direction = "right"
								break;
							case 40:
								this.y_movement = 2
								this.direction = "down"
								break;
						}
						if(this.x_movement || this.y_movement){
							let x = this.x + (this.x_movement ? this.x_movement / Math.abs(this.x_movement) * 16: 0);
							let y = this.y + (this.y_movement ? this.y_movement / Math.abs(this.y_movement) * 16: 0);
							let id = $.game.filed_id;
							let filed = $.game.entity.filed[id];
							// playerのspriteサイズとfiledのスプライトサイズの差分を計算
							// filedサイズ<playerサイズかつplayer%filed=0なら問題ない
							let multi_x = $.player.sprite_w / filed.sprite_w;
							let multi_y = $.player.sprite_h / filed.sprite_h;
							let diff_x = multi_x * filed.sprite_w;
							let diff_y = multi_y * filed.sprite_h;
							if(0 <= x && x < filed.width - diff_x && 
								0 <= y && y < filed.height - diff_y &&
								!filed.is_hit(x, y, multi_x, multi_y)){
								this.is_moveing = true;
								this.move();
							}
						}
					}
				}
				let hoge = null;
				$.cpu.on("enter_frame", function() {
					this.frame += 1;
					if(this.frame === 1 || this.frame % 25 === 0){
						this.map = new Game.InfruenceMap();
						let num = Math.floor(1 / $.filed.enemys.length * 100) / 100;
						
						$.filed.enemys.map((enemy) => {
							this.map.product_sum(enemy.map, num);
						})
					}
					$.cpu.move();
				})

				$.cpu.move = function() {
					//TODO: 0 1 0 2 
					if(this.is_moveing){
						this.move_by(this.x_movement, this.y_movement);
						if((this.x % 16 === 0) && (this.y % 16 === 0)){
							this.is_moveing = false;
						}
					}else{
						let xx = [0, -1, 1, 0];
						let yy = [1, 0, 0, -1];
						let x = this.x / 16;
						let y = this.y / 16;
						let current = this.map.nodes[y][x];
						let direction = -1;
						 for (let i = 0; i < 4; i+=1) {
		                    if (current < this.map.nodes[y + yy[i]][x + xx[i]]) {
		                        direction = i;
		                        break;
		                    }
		                }
						this.x_movement = 0;
						this.y_movement = 0;
						switch(direction){
							case 0:
								this.y_movement = -2;
								this.input = "up"
								break;
							case 1:
								this.x_movement = -2
								this.input = "left"
								break;
							case 2:
								this.x_movement = 2
								this.input = "right"
								break;
							case 3:
								this.y_movement = 2
								this.input = "down"
								break;
						}
						if(this.x_movement || this.y_movement){
							let x = this.x + (this.x_movement ? this.x_movement / Math.abs(this.x_movement) * 16: 0);
							let y = this.y + (this.y_movement ? this.y_movement / Math.abs(this.y_movement) * 16: 0);
							let id = $.game.filed_id;
							let filed = $.game.entity.filed[id];
							// playerのspriteサイズとfiledのスプライトサイズの差分を計算
							// filedサイズ<playerサイズかつplayer%filed=0なら問題ない
							let multi_x = $.player.sprite_w / filed.sprite_w;
							let multi_y = $.player.sprite_h / filed.sprite_h;
							let diff_x = multi_x * filed.sprite_w;
							let diff_y = multi_y * filed.sprite_h;
							if(0 <= x && x < filed.width - diff_x && 
								0 <= y && y < filed.height - diff_y &&
								!filed.is_hit(x, y, multi_x, multi_y)){
								this.is_moveing = true;
								this.move();
							}
						}
					}
				}

				// enemy
				$.game.enemy_type.add_type({
					name: "zombie1",
					img: $.game.source.images.zombie1,
					tile_w: 32,
					tile_h: 48,
					frame: {
						down: [{x: 0,	y: 24},{x: 32, y: 24},{x: 64, y: 24}],
						left: [{x: 0,y: 88},{x: 32,y: 88},{x: 64,y: 88}],
						right: [{x: 0,y: 152},{x: 32,y: 152},{x: 64,y: 152}],
						up: [{x: 0,y: 216},{x: 32,y: 216},{x: 64,y: 216}],
					}
				})
				$.filed.enemy_manager.max_num = 3;
				$.filed.on("appear_enemy", function (e) {
					this.on("enter_frame", function () {
						this.frame += 1;
						let player_x = Math.floor($.player.x / $.filed.sprite_w) * $.filed.sprite_w;
						let player_y = Math.floor($.player.y / $.filed.sprite_h) * $.filed.sprite_h;
						if(this.frame % 30 === 0 || this.frame === 1){
							this.generate_effect_map($.core.w, $.core.h, player_x, player_y)
						}
						if(this.running){
							this.move();
						}
					});
					this.move = function (){
						let input = this.input || "down";
						this.tile_x = this.type.frame[input][1].x;
						this.tile_y = this.type.frame[input][1].y;
						if(this.is_moveing){
							switch(this.frame % 6){
								case 2:
								case 3:
									this.tile_x = this.type.frame[input][0].x;
									this.tile_y = this.type.frame[input][0].y;
									break;
								case 4:
								case 5:
									this.tile_x = this.type.frame[input][2].x;
									this.tile_y = this.type.frame[input][2].y;
									break;
							}
							this.move_by(this.x_movement, this.y_movement);
							let id = $.game.filed_id;
							let filed = $.game.entity.filed[id];
							if((this.x % filed.sprite_w === 0) && (this.y % filed.sprite_h === 0)){
								this.is_moveing = false;
								this.commands.shift();
								// FIXED: 当たり判定バグ
								if($.player.is_intersect(this)){
									$.core.stop();
									$.core.store_game_state("gameover_menu");
								};
							}
						}else{
							this.x_movement = 0;
							this.y_movement = 0;
							this.command = this.commands[0];
							switch(this.command){
								case "up":
									this.y_movement = -1;
									this.input = "up"
									break;
								case "left":
									this.x_movement = -1
									this.input = "left"
									break;
								case "right":
									this.x_movement = 1
									this.input = "right"
									break;
								case "down":
									this.y_movement = 1
									this.input = "down"
									break;
							}

							if(this.x_movement || this.y_movement){
								let x = this.x + (this.x_movement ? this.x_movement / Math.abs(this.x_movement) * 16: 0);
								let y = this.y + (this.y_movement ? this.y_movement / Math.abs(this.y_movement) * 16: 0);
								let id = $.game.filed_id;
								let filed = $.game.entity.filed[id];
								let multi_x = this.tile_w / 16;
								let multi_y = this.tile_h / 16;
								let diff_x = multi_x * 16;
								let diff_y = multi_y * 16;
								if(0 <= x && x < 512 - diff_x && 
									0 <= y && y < 512 - diff_y && 
									!filed.is_hit(x, y, multi_x, multi_y)){
									for(let i = 0, len = $.filed.enemys.length; i < len; i += 1){
										if($.filed.enemys[i] !== this){
											if($.filed.enemys[i].x !== x || $.filed.enemys[i].y !== y){
												this.is_moveing = true;
												this.move();
											}
										};
									}
								}
							}
						}
					}

				})

				$.filed.on("enter_frame", function (e) {
					this.frame += 1;
					if(this.frame === 1 || this.frame % 50 === 0){
						let index = $.filed.enemy_manager.appear_enemy($.game.view_pt.x + $.core.w, $.game.view_pt.y + $.core.h)
						if(index !== -1){
							$.game.add_enemy($.filed.enemys[index]);
						}
					}
				})
					
				// Gameオブジェクト内のシーンを作成する
				$.game.show_ui();
				let display_score = new Game.InScene("score",create_score());
				display_score.show();
				display_score.on("enter_frame", function (e){
					let {m,s} = Game.conversion_time($.core.elapsed_time, true);
					this.parent_node.innerHTML = m + s;
				})

				$.game.add_scene(display_score);

				// fpsを開始する
				$.core.start();
			};
		})

	});

	function load(context){
		context.load(collections, 100, function(result) {
			$.core.store_game_state("loading");
			$.core.render_fore(result);
		});
	}

	function render_filed(context, w, h) {
		let filed = new Game.Filed(512, 512);
		filed.img = context.source.images.dungeon;
		filed.img_pt = Game.create_point(filed.img.width, filed.img.height, 16, 16);
		filed.csv = context.source.csves.filed;
		filed.collision = context.source.csves.collision;
		filed.view_pt = Game.create_point(w, h, 16, 16);
		return filed;
	}

	function render_player(context) {
		let player = new Game.Player(32, 32, "multiple");
		player.img = context.source.images.player;
		player.sprite_pos = player.generate_view_pt(["down", "left", "right", "up"])
		player.direction = "down";
		return player;
	}

	function render_cpu(context) {
		let cpu = new Game.Player(32, 32, "multiple");
		cpu.img = context.source.images.player;
		cpu.sprite_pos = cpu.generate_view_pt(["down", "left", "right", "up"])
		cpu.direction = "up";
		cpu.x = 160;
		cpu.y = 160;
		return cpu;
	}

	function create_title_menu() {
		let title_menu = [];
		title_menu.push(document.querySelector(".title_menu"));
		title_menu.push(title_menu[0].children[0]);
		title_menu.push(title_menu[0].children[1]);
		title_menu.push(title_menu[0].children[2]);

		$.core.root_node.addEventListener(sprt.TOUCH_START, (e) => {
			$.last_touch_target = title_menu[0];
			e.stopPropagation();
		})
		
		title_menu[2].addEventListener(sprt.TOUCH_START, (e)=> {
			e.stopPropagation();
			$.core.store_game_state("loading");
		})

		title_menu[3].addEventListener(sprt.TOUCH_START, (e)=> {
			e.stopPropagation();
			$.core.store_game_state("loading");
		})

		// TODO:enchant参考にする
		document.addEventListener("keydown", (e)=> {
			if($.last_touch_target === title_menu[0]){
				let key_code = e.keyCode;
				// up key 38 down key 40;
				if(key_code === 38){
					Game.atr_toggle("data-select", title_menu, "up");
				}else if(key_code === 40){
					Game.atr_toggle("data-select", title_menu, "down");
				}else if(key_code === 13){
					//TODO: get attr
					$.core.store_game_state("loading");
				}
			}
		});

		return title_menu;
	}

	function create_gameover_menu() {
		let gameover_menu = [];
		gameover_menu.push(document.querySelector(".gameover-menu"));
		gameover_menu.push(gameover_menu[0].children[0]);
		gameover_menu.push(gameover_menu[0].children[1]);
		gameover_menu.push(gameover_menu[0].children[2]);

		$.core.root_node.addEventListener(sprt.TOUCH_START, (e) => {
			$.last_touch_target = gameover_menu[0];
			e.stopPropagation();
		})
		
		gameover_menu[2].addEventListener(sprt.TOUCH_START, (e)=> {
			e.stopPropagation();
			$.core.rewind()
			$.core.store_game_state("loading");
		})

		document.addEventListener("keydown", (e)=> {
			if($.last_touch_target === gameover_menu[0]){
				let key_code = e.keyCode;
				// up key 38 down key 40;
				if(key_code === 13){
					$.core.rewind();
					$.core.store_game_state("loading");
				}
			}
		});

		return gameover_menu;
	}

	function create_score () {
		let score_elem = document.querySelector(".score");

		return score_elem;
	}

	function render_bullet() {
		let bullet = new Shot(this.direction);
		bullet.sprite_x = 46
		bullet.sprite_y = 100;
		bullet.sprite_w = 8;
		bullet.sprite_h = 16;
		bullet.x = this.x + this.sprite_w / 2 - bullet.sprite_w / 2;
		bullet.y = this.y + this.sprite_h / 2 - bullet.sprite_h / 2;
		bullet.img = $.game.source.images.player;
		bullet.alive = true;
		return bullet;
	}

	class Shot extends Game.Player{
		constructor(d) {
			super();
			this.alive = true;
			this.direction = d;
		}
		move(num){
			switch(this.direction){
				case "up":
					this.y -= num;
					break;
				case "right":
					this.x += num;
					break;
				case "down":
					this.y += num;
					break;
				case "left":
					this.x -= num;
					break;
			}
		}
	}
}());

