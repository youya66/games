import * as dom from "./dom";

(function () {
	let root = self;

	let Game = {};
	root.Game = Game;

	// init variable
	Game.assets = {};
	Game.dom = {};

	let Obj_proto = Object.prototype;
	let Arr_proto = Array.prototype;
	let Func_proto = Function.prototype;
	let toString = Obj_proto.toString;
	let slice = Arr_proto.slice;
	let call = Func_proto.call;

	Game.dom.title_menu = dom.create_html("title_menu");
	Game.dom.title_menu_css = dom.create_css("title_menu_css")

	Game.store_state = function () {
		// title, loading, gameover, continue, title_menu, setting
		let state = "title";
		return state;
	}

	Game.namespace = function (string) {
		let parts = string.split(".")
		let parent = Game;

		if(parts[0] === "Game"){
			parts = parts.slice(1);
		}

		for(let i = 0, length = parts.length; i < length; i += 1){
			if(typeof parent[parts[i]] === "undefined"){
				parent[parts[i]] = {};
			}
			parent = parent[parts[i]];
		}
		return parent;
	};
	
	Game.is_bool = function (obj) {
		return obj === true || obj === false || toString.call(obj) === "[object Boolean]";
	}

	Game.is_array = function (arr) {
		return toString.call(arr) === "[object Array]";
	}

	Game.is_dict = function (obj) {
		return toString.call(obj) === "[object Object]";
	};

	Game.init_assets = function (arr) {
		if(!Game.is_array(arr)){
			return false;
		}

		let collections = {
			images: [],
			xmls: []
		};


		for(let i = 0, length = arr.length; i < length; i += 1){
			switch(arr[i].type) {
				case "image":
					collections.images.push(arr[i]);
					break;

				case "xml":
					collections.xmls.push(arr[i]);
					break;
			}
		}
		return collections;
	};

	Game.loading_and_progress = function (col, mili) {
		let imgs_length = col.images.length;
		let xml_length = col.xmls.length;
		let time = mili || 0;

		// title menu も含めるので最後に1を足す。
		let loaded = Game.progress_render(time, imgs_length + xml_length + 1);
		
		Game.create_title_menu(loaded);
		loaded();
		
		let assets = {
			images: {},
			csv: {},
			xhr: {},
			fetch_images: function () {
				return assets.images;
			},
			fetch_csv: function () {
				return assets.csv;
			}
		};

		// load images
		for(let i = 0; i < imgs_length; i += 1){
			let item = col.images[i];
			
			assets.images[item.name] = new Image();
			assets.images[item.name].src = item.src;
			assets.images[item.name].onload = loaded();
		}

		// load xml;
		for(let i = 0; i < xml_length; i += 1){
			let item = col.xmls[i];

			assets.xhr[item.name] = new XMLHttpRequest();
			assets.xhr[item.name].onload = () => {
				save_csv(assets.xhr[item.name].responseXML, item.name)
				loaded();
			};
			assets.xhr[item.name].open("get", item.src, true);
			assets.xhr[item.name].send();
		}

		// extract csv to xml;
		let save_csv = function (text, prop) {
			let elem_layer = text.querySelectorAll("layer");

			for(let i = 0, length = elem_layer.length; i < length; i += 1){
				let elem = elem_layer[i];
				let name = elem.attributes.name.nodeValue;
				let csv_str = elem.childNodes[1].innerHTML;

				assets.csv[name] = parce_csv(name, csv_str);
			}

			delete assets.xhr.prop;
		}

		let parce_csv = function (name, text) {
			assets.csv[name] = [];
			let one_arr = text.split("\n");
			let two_arr = [];

			one_arr.shift();
			one_arr.pop();

			for(let i = 0, length = one_arr.length; i < length; i += 1) {
				one_arr[i] = one_arr[i].substring(0, one_arr[i].length - 1);
				two_arr[i] = one_arr[i].split(",");
				for(let j = 0; j < two_arr[i].length; j += 1){
					two_arr[i][j] = two_arr[i][j] - 0;
				}
			}
			return two_arr;
		}

		return assets;
	};

	Game.store_progress = function (len) {
		let i = 0;

		return function () {
			let parcent = Math.floor((i / len) * 100);
			i = i + 1;
			return parcent;
		}
	};

	Game.progress_render = function (mill, len) {
		let call_times = 0;
		let last_date = new Date().getTime();
		// ロード時間の最小値
		let load_min_time = 300;
		let interval = 0;
		let fetch_progress = Game.store_progress(len);

		interval = Math.max(mill, load_min_time) / len;

		return Game.progress_render = function (context) {
			if(context != null && context !== false){
				Game.assets[context] = this;
			}
			let now = new Date().getTime();
			call_times += 1;
			if(last_date + interval <= now){
				while(call_times >= 1){
					last_date = now;
					call_times -= 1;
					Game.render_fore("progress",fetch_progress());
					break;
				}
			}else{
				let diff = now - (last_date + interval);
				setTimeout(Game.progress_render, diff);
			}
		}
	};

	Game.fetch_image_point = function(w, h, x, y) {
	    let ix = 0;
	    let iy = 0;
	    for(;iy <= h; iy += y){
	        ix = 0;
	        for(; ix <= w; ix += x){
	            point.push({
	                x: ix,
	                y: iy
	            }) 
	        }
	    }
	}

	Game.store_canvases = function (dict) {
		Game.namespace("Game.canvas");
		let canvas = Game.canvas = [];

		if(Game.is_dict(dict)){
			for(let key in dict) {
				canvas.push(dict[key]);
			}
		}
	}

	Game.store_contexts = function (dict) {
		Game.namespace("Game.contexts");
		let contexts = Game.contexts = [];

		if(Game.is_dict(dict)){
			for(let key in dict) {
				contexts.push(dict[key]);
			}
		}
	}

	Game.render_back = function () {

	}

	Game.render_middle = function () {
		let canvas = Game.canvas[1];
		let ctx = Game.contexts[1];
	}

	Game.render_fore = function (context) {
		let canvas = Game.canvas[2];
		let ctx = Game.contexts[2];
		let args = slice.call(arguments, 1);
		if(context === "progress") {
			let w = 200;
			let h = 50;
			let x = (canvas.width / 2) - (w / 2);
			let y = (canvas.height / 2) - (h / 2);
			
			// 初期化
			ctx.clearRect(x, y, w, h);
			ctx.strokeStyle = "rgba(33,150,243,1)";
			ctx.fillStyle = "rgba(33,150,243,1)";
			
			// 枠を描く
			ctx.beginPath();
			ctx.strokeRect(x, y, w, h);

			// 進捗分だけ色を塗りつぶす
			let pg_w = w * (args[0] / 100);
			ctx.fillRect(x, y, pg_w, h);
			
			if(args[0] === 100){
				setTimeout(Game.render_fore, 100, "title_menu");
			}
		} else if(context === "title_menu") {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(Game.assets.title_menu, 0, 0)
		}
	}

	Game.click = function (e) {
		// thisはcallback元のdom
	}

	Game.create_title_menu = function (title, style, setting){
		let canvas = Game.canvas[2];

		if(title == null) {
			throw new Error("TypeError: title is not defined, Game.js")
		}

		let elem = Game.dom.title_menu.querySelector(".menu__title > p");
		elem.textContent = title;

		if(style != null && is_dict(style)){

		}

		for(let key in Game.dom.title_menu_css){
			let elem;
			if(key === "menu"){
				elem = Game.dom.title_menu;
			}else{
				elem = Game.dom.title_menu.querySelector("." + key);
			}
			let css = Game.dom.title_menu_css[key];
			for(let k in css){
				let tmp = k;

				k = k.replace(/_[A-Za-z]/, (match) => {
					let str = match.substring(1);
					return str.toUpperCase();
				});

				elem.style[k] = css[tmp];
			}
		}

		if(setting == null){
			setting = false;
		}

		if(Game.is_bool(setting) && setting === false){
			let elem = Game.dom.title_menu.querySelector(".menu__setting");
			Game.dom.title_menu.removeChild(elem)
		}

   		return Game.create_title_menu = function (cb) {
   			let canvas = Game.canvas[2];
   			let data = "<svg xmlns='http://www.w3.org/2000/svg' width='" + canvas.width + "' height='" + canvas.height + "'>" +
						"<foreignObject width='100%' height='100%'>" +
						"<div xmlns='http://www.w3.org/1999/xhtml' style='width: 512px'>" +
						Game.dom.title_menu.outerHTML +
						"</div>" +
						"</foreignObject>" +
						"</svg>";

			let DOMURL = self.URL || self.webkitURL || self;
	   		let svg = new Blob([data], {type: "image/svg+xml; charset=utf-8"});
	   		let url = DOMURL.createObjectURL(svg);
	   		let img = new Image();
	   		img.src = url;
	   		img.onload = function () {
	   			DOMURL.revokeObjectURL(url);
	   			cb.call(img, "title_menu")
	   		}
   		}
	}
})();