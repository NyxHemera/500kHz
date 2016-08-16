window.addEventListener('load', init, false);

var Colors = {
	orb: 0xF12525,
	beatOrb: 0x62D9FF,
};

var deltaTime = 0;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();
var paused = false;
var BPM = 120;
var beatHandler;

var orb;
var beatArr = [];

function init() {

	// Create Environment
	createScene();
	createLights();

	beatHandler = new BeatHandler(BPM);

	// Create Objects
	orb = new Orb(30, Colors.orb);
	orb.mesh.position.y = -110;
	scene.add(orb.mesh);

	code = new CodeEnemy("apple", Colors.beatOrb);
	scene.add(code.mesh);

	createBeat();

	// Handle input
	document.addEventListener('mousedown', handleMouseDown, false);
	document.addEventListener('mouseup', handleMouseUp, false);
	document.addEventListener('touchstart', handleMouseDown, false);
	document.addEventListener('touchend', handleMouseUp, false);

	// run Gameloop
	loop();

}

var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane,
	HEIGHT, WIDTH, renderer, container;

function createScene() {

	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;

	scene = new THREE.Scene();

	scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);

	camera.position.x = 0;
	camera.position.z = 300;
	camera.position.y = 0;

	renderer = new THREE.WebGLRenderer({
		alpha: true,
		antialias: true
	});

	renderer.setSize(WIDTH, HEIGHT);
	renderer.shadowMap.enabled = true;

	container = document.getElementById('world');
	container.appendChild(renderer.domElement);

	window.addEventListener('resize', handleWindowResize, false);
	window.addEventListener('blur', handleBlur, false);
	window.addEventListener('focus', handleFocus, false);
}

var hemisphereLight, shadowLight;

function createLights() {

	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);
	shadowLight = new THREE.DirectionalLight(0xffffff, .9);

	shadowLight.position.set(150, 350, 350);
	shadowLight.castShadow = true;

	shadowLight.shadow.camera.left = -400;
	shadowLight.shadow.camera.right = 400;
	shadowLight.shadow.camera.top = 400;
	shadowLight.shadow.camera.bottom = -400;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;

	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;

	scene.add(hemisphereLight);
	scene.add(shadowLight);

}

function createBeat() {
	var startingPosX = -1000;

	for(var i=0; i<20; i++) {
		beatArr.push(new Orb(10, Colors.beatOrb));

		beatArr[i].mesh.position.y = -110;
		beatArr[i].mesh.position.x = startingPosX + 100 * i;

		scene.add(beatArr[i].mesh);
	}
}

function clearBeat() {
	for(var i=0; i<beatArr.length; i++) {
		scene.remove(beatArr[i].mesh);
	}
	beatArr = [];
}

function getActualWidth(obj) {
	return obj.mesh.geometry.parameters.width * obj.mesh.scale.x;
}

function getVisibleHeight(obj) {
	var objWidth = getActualWidth(obj);
	var dist = camera.position.z - obj.mesh.position.z - objWidth/2; // Assumes cube
	var vFOV = camera.fov * Math.PI / 180; // convert vertical fov to radians
	var height = 2 * Math.tan(vFOV / 2) * dist;
	return height;
}

function getPPU(obj) {
	var vH = getVisibleHeight(obj);
	return getActualWidth(obj) / vH;
}

class Orb {

	constructor(size, color) {
		this.growing = false; // True if growing, false if shrinking
		this.atRest = true; // Is available for bouncing
		this.bouncing = false; // True if growing, false if shrinking
		this.bounceVel = 0;
		this.maxVel = .0003;
		this.acceleration = .00001;

		this.currentScale = 1;
		this.maxScale = 1.5;

		this.geom = new THREE.BoxGeometry(size, size, size);
		this.geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));

		this.geom.mergeVertices();

		this.mat = new THREE.MeshPhongMaterial({
			color: color,
			transparent: true,
			opacity: .8,
			shading: THREE.FlatShading,
		});

		this.mesh = new THREE.Mesh(this.geom, this.mat);
		this.mesh.receiveShadow = true;
		this.mesh.castShadow = true;
	}

	animate() {
		this.mesh.rotation.z += .003 * deltaTime;
		this.mesh.rotation.x += .0005 * deltaTime;

		this.atRest ? this.bounce() : this.grow();
	}

	grow() {
		if(this.growing && this.currentScale < this.maxScale) {
			this.atRest = false;
			this.currentScale += .005 * deltaTime;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
		}else if(!this.growing && this.currentScale > 1){
			this.currentScale -= .005 * deltaTime;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
			this.atRest = Math.abs(1 - this.currentScale) < .005;
		}
	}

	bounce() {
		if(this.bouncing && this.currentScale <= 1.1) {
			// Use velocity and acceleration to make a smooth transition
			this.bounceVel < this.maxVel ? this.bounceVel += this.acceleration : this.bounceVel = this.maxVel;
			this.currentScale += this.bounceVel * deltaTime;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
			this.bouncing = this.currentScale <= 1.1;
		}else if(!this.bouncing && this.currentScale >= .9) {
			// Use velocity and acceleration to make a smooth transition
			this.bounceVel > -this.maxVel ? this.bounceVel -= this.acceleration : this.bounceVel = -this.maxVel;

			this.currentScale += this.bounceVel * deltaTime;
			this.mesh.scale.set(this.currentScale, this.currentScale, this.currentScale);
			this.bouncing = this.currentScale <= .9;
		}
	}

	move() {
		var dist = beatHandler.BPM * 100 / 60 / 1000; // BPM * distance between beats / seconds per minute / ms
		this.mesh.position.x -= dist * deltaTime;
	}

	toggleGrowing() {
		this.growing = !this.growing;
		this.atRest = false;
	}

}

class CodeEnemy {

	constructor(word, color) {

		this.word = word;
		this.codeArr = CodeEnemy.convertWordToMorse(word);

		this.mesh = new THREE.Object3D();

		this.holdGeom = new THREE.BoxGeometry(6,2,2);
		this.tapGeom = new THREE.SphereGeometry(3,8,8);
		this.mat = new THREE.MeshPhongMaterial({
			color: color,
			transparent: true,
			opacity: .8,
			shading: THREE.FlatShading,
		});

		for(var i=0; i<this.codeArr.length; i++) {
			for(var j=0; j<this.codeArr[i].length; j++) {

				if(this.codeArr[i][j] === 3) {
					var m = new THREE.Mesh(this.holdGeom, this.mat);
				}else if(this.codeArr[i][j] === 1) {
					var m = new THREE.Mesh(this.tapGeom, this.mat);
				}

				m.position.y = -(i * 9) + ((this.codeArr.length-1) * 9)/2; // Position elements first, then center by half of total height
				m.position.x = (j * 9) - ((this.codeArr[i].length-1) * 9 )/2; // 9 is width of geom + 3 distance between;

				m.castShadow = true;
				m.receiveShadow = true;

				this.mesh.add(m);

			}
		}

	}

	static convertWordToMorse(word) {
		var wordArr = word.toLowerCase().split('');
		var codeArr = [];

		for(var i=0; i<wordArr.length; i++) {
			codeArr.push(this.convertLetterToMorse(wordArr[i]));
		}
		return codeArr;
	}

	static convertLetterToMorse(letter) {
		var code = {
			a: [1,3], b: [3,1,1,1], c: [3,1,3,1], d: [3,1,1], e: [1],
			f: [1,1,3,1], g: [3,3,1], h: [1,1,1,1], i: [1,1], j: [1,3,3,3],
			k: [3,1,3], l: [1,3,1,1], m: [3,3], n: [3,1], o: [3,3,3],
			p: [1,3,3,1], q: [3,3,1,3], r: [1,3,1], s: [1,1,1], t: [3],
			u: [1,1,3], v: [1,1,1,3], w: [1,3,3], x: [3,1,1,3],
			y: [3,1,3,3], z: [3,3,1,1]
		};
		return code[letter];
	}

}

class BeatHandler {

	constructor(BPM) {
		this.BPM = BPM
		this.timeSinceLastBeat = 0;
		this.beatLength = 60 / BPM * 1000; // In ms

		this.tapping = false;
		this.tapTimeStarted = 0;
		this.tapLength = 0;
		this.tapTimeEnded = 0;
		this.holding = false;

		this.moveArr = [];
	}

	startTap() {
		this.tapTimeStarted = new Date().getTime();
		if(this.isValidTap(this.tapTimeStarted)) {
			this.tapping = true;
		}

	}

	endTap() {
		this.tapTimeEnded = new Date().getTime();

		this.tapLength = this.tapTimeEnded - this.tapTimeStarted;

		this.isValidMove(this.tapLength, this.beatLength) ? this.logMove() : this.clearMoveArr();

		this.tapTimeStarted = 0;
		this.tapTimeEnded = 0;
		this.tapping = false;
		console.log(this.moveArr);
	}

	// Checks if click is close enough to the beat
	isValidTap() {
		var timeDiff = Math.min(this.timeSinceLastBeat, this.beatLength - this.timeSinceLastBeat);
		// console.log("timediff - " + timeDiff);
		// console.log("margin - " + this.beatLength*.20);
		return Math.abs(timeDiff) < this.beatLength*.20; // At 120BPM you have a 200ms margin
	}

	// Checks if move is a valid tap or hold
	isValidMove(length, beatLength) {
		if(!this.tapping) { // If original mousedown wasn't valid, this will return false
			return false;
		}

		if(length <= 125) {
			return true;
		}else if(length > beatLength*.5 && length < beatLength*1.5 && this.isValidTap()) { // Hold must be within the margins of the first beat, and be close enough to it.
			return true;
		}else {
			return false;
		}
	}

	// 1 - Tapping
	// 3 - Holding
	logMove() {
		// Stop or Hold
		if(this.tapLength <= 125) { // A tap is only recognized as shorter than 125ms
			this.moveArr.push(1);
		}else {
			this.moveArr.push(3);
		}
	}

	clearMoveArr() {
		this.moveArr = [];
		this.lastMoveLogged = false;
	}

	update(dt) {
		this.timeSinceLastBeat += dt;

		// Only run when the beat hits
		if(this.timeSinceLastBeat >= this.beatLength) {
			this.timeSinceLastBeat %= this.beatLength;
		}
	}

	setBPM(newBPM) {
		this.BPM = newBPM;
		this.beatLength = 60 / this.BPM * 1000;
		clearBeat();
		createBeat();
		clearInterval(this.beatPrinter);
		this.beatPrinter = setInterval(function() {
			console.log("Beat");
		}, this.beatLength);
	}

}

function loop() {
	if(!paused) {
		newTime = new Date().getTime();
		deltaTime = newTime-oldTime;
		oldTime = newTime;

		beatHandler.update(deltaTime);

		orb.animate();

		for(var i=0; i<beatArr.length; i++) {
			beatArr[i].animate();
			beatArr[i].move();

			if(beatArr[i].mesh.position.x < -1000) {
				// Reposition
				var beat = beatArr.splice(i, 1)[0];
				beat.mesh.position.x = beatArr[beatArr.length - 1].mesh.position.x + 100;
				beatArr.push(beat);
				i--;
			}
		}

		renderer.render(scene, camera);
	}

	requestAnimationFrame(loop);
}




// Event handlers:
function handleMouseDown() {
	orb.toggleGrowing();
	beatHandler.startTap();
}

function handleMouseUp() {
	orb.toggleGrowing();
	beatHandler.endTap();
}

function handleWindowResize() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}

// Necessary to prevent beat desyncronization and animation distortion
function handleFocus() {
	newTime = new Date().getTime();
	oldTime = newTime;
	deltaTime = 0;

	togglePaused();
}

function handleBlur() {

	togglePaused();
}

function togglePaused() {
	paused = !paused;
}